import { beforeEach, describe, expect, it } from "vitest";
import { as, createDb, createUser, one, seedArea, seedCard, type Db } from "./db";

const ADMIN = "00000000-0000-4000-8000-0000000000aa";
const users = Array.from({ length: 25 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);

let db: Db;
let area: string;
let card: string;

async function status(id = card) {
  return (await db.query<{ status: string }>("select status from dailycards.cards where id = $1", [id])).rows[0].status;
}
async function runRules() {
  await db.query("select dailycards_private.apply_feedback_rules()");
}

beforeEach(async () => {
  db = await createDb();
  await createUser(db, ADMIN, { admin: true });
  area = await seedArea(db, "software", "full");
  card = await seedCard(db, area, "term", 0);
  for (const u of users) {
    await createUser(db, u);
    await as(db, u, "select dailycards.follow_area($1)", [area]);
  }
});

describe("regras automáticas", () => {
  it("3 'informação incorreta' de usuários diferentes manda para revisão, continua no ar", async () => {
    for (const u of users.slice(0, 3))
      await as(db, u, "select dailycards.report_card($1, 'incorrect', 'errado', null)", [card]);
    await runRules();
    expect(await status()).toBe("in_review");
  });

  it("repetir a sugestão do mesmo usuário não conta duas vezes", async () => {
    for (let i = 0; i < 4; i++)
      await as(db, users[0], "select dailycards.report_card($1, 'incorrect', 'errado', null)", [card]);
    await runRules();
    expect(await status()).toBe("active");
  });

  it("5 'informação incorreta' tira da rotação", async () => {
    for (const u of users.slice(0, 5))
      await as(db, u, "select dailycards.report_card($1, 'incorrect', null, null)", [card]);
    await runRules();
    expect(await status()).toBe("paused");
  });

  it("média < 3 com 10 notas vai para revisão; < 2,5 com 20 pausa", async () => {
    for (const u of users.slice(0, 10)) await as(db, u, "select dailycards.rate_card($1, 2)", [card]);
    await runRules();
    expect(await status()).toBe("in_review");
    for (const u of users.slice(10, 20)) await as(db, u, "select dailycards.rate_card($1, 2)", [card]);
    await runRules();
    expect(await status()).toBe("paused");
  });

  it("poucas notas não disparam nada", async () => {
    for (const u of users.slice(0, 9)) await as(db, u, "select dailycards.rate_card($1, 1)", [card]);
    await runRules();
    expect(await status()).toBe("active");
  });

  it("limita sugestões por usuário por dia", async () => {
    for (let i = 0; i < 20; i++)
      await as(db, users[0], "select dailycards.report_card($1, 'confusing', null, null)", [card]);
    await expect(
      as(db, users[0], "select dailycards.report_card($1, 'confusing', null, null)", [card]),
    ).rejects.toThrow("rate_limited");
  });
});

describe("admin", () => {
  const save = (id: string | null, text: string, type = "term", question: unknown = null) =>
    one<string>(
      db,
      ADMIN,
      `select dailycards.admin_save_card($1, $2, 'technical', $3, 5, 'pt-BR', $4, 'corpo', $5,
        'https://example.com', 'Fonte', null)`,
      [id, area, type, text, question],
    );

  it("rascunho é editado no lugar; card publicado ganha versão nova", async () => {
    const id = (await save(null, "v1")) as string;
    await save(id, "v1 editado");
    expect((await db.query("select * from dailycards.card_versions where card_id = $1", [id])).rows).toHaveLength(1);
    await as(db, ADMIN, "select dailycards.admin_set_status($1, 'active')", [id]);
    await save(id, "v2");
    const { rows } = await db.query<{ current_version: number }>("select current_version from dailycards.cards where id = $1", [id]);
    expect(rows[0].current_version).toBe(2);
  });

  it("valida pergunta", async () => {
    await expect(save(null, "q", "question", { options: ["a"], answer: 0 })).rejects.toThrow("invalid_question");
    await expect(save(null, "q", "question", { options: ["a", "b"], answer: 2 })).rejects.toThrow("invalid_question");
    expect(await save(null, "q", "question", { options: ["a", "b"], answer: 1 })).toBeTruthy();
  });

  it("corrigir exige versão nova e avisa quem sugeriu; nota zera na versão nova", async () => {
    await as(db, users[0], "select dailycards.report_card($1, 'incorrect', 'x', null)", [card]);
    await as(db, users[1], "select dailycards.rate_card($1, 1)", [card]);
    await expect(as(db, ADMIN, "select dailycards.admin_review($1, 'fix', 'ok')", [card])).rejects.toThrow(
      "fix_requires_new_version",
    );
    await one(
      db,
      ADMIN,
      `select dailycards.admin_save_card($1, null, null, null, null, 'pt-BR', 'corrigido', 'corpo', null,
        'https://example.com', 'Fonte', null, true)`,
      [card],
    );
    await as(db, ADMIN, "select dailycards.admin_review($1, 'fix', 'corrigido')", [card]);
    expect(await status()).toBe("active");
    const outbox = await db.query("select * from dailycards.email_outbox where user_id = $1", [users[0]]);
    expect(outbox.rows).toHaveLength(1);
    const reports = await db.query<{ status: string }>("select status from dailycards.reports");
    expect(reports.rows[0].status).toBe("applied");
    const stats = await db.query<{ n: number }>(
      "select count(*)::int n from dailycards.ratings r join dailycards.cards c on c.id = r.card_id and r.version = c.current_version",
    );
    expect(stats.rows[0].n).toBe(0);
  });

  it("manter arquiva sugestões sem e-mail", async () => {
    await as(db, users[0], "select dailycards.report_card($1, 'context', 'x', null)", [card]);
    await as(db, ADMIN, "select dailycards.admin_review($1, 'keep', 'está certo')", [card]);
    expect((await db.query("select * from dailycards.email_outbox")).rows).toHaveLength(0);
    expect((await db.query<{ status: string }>("select status from dailycards.reports")).rows[0].status).toBe("dismissed");
  });

  it("importa rascunhos em lote", async () => {
    const n = await one<number>(db, ADMIN, "select dailycards.admin_import_cards($1)", [
      JSON.stringify([
        { area: "software", layer: "technical", type: "term", widget_text: "a", body: "b", source_url: "https://x.dev", source_label: "X" },
        { area: "software", layer: "technical", type: "question", widget_text: "q", body: "b", question: { options: ["1", "2"], answer: 0 }, source_url: "https://x.dev", source_label: "X" },
      ]),
    ]);
    expect(n).toBe(2);
    expect((await db.query("select * from dailycards.cards where status = 'draft'")).rows).toHaveLength(2);
  });

  it("aprova trend: cria card publicado e coloca na semana", async () => {
    const { rows } = await db.query<{ id: string }>(
      "insert into dailycards.trend_items (area_id, url, title) values ($1, 'https://x.dev/a', 'Novidade') returning id",
      [area],
    );
    await one(
      db,
      ADMIN,
      `select dailycards.admin_approve_trend($1, 'pt-BR', '2026-11-16', 'Manchete', 'Resumo', 'https://x.dev/a', 'X', '2026-11-12')`,
      [rows[0].id],
    );
    const pick = await db.query<{ type: string; status: string }>(
      "select c.type, c.status from dailycards.weekly_picks w join dailycards.cards c on c.id = w.card_id",
    );
    expect(pick.rows[0]).toEqual({ type: "trend", status: "active" });
  });

  it("admin lê conteúdo direto; usuário comum não", async () => {
    expect(await as(db, ADMIN, "select * from dailycards.cards")).toHaveLength(1);
    expect(await as(db, users[0], "select * from dailycards.cards")).toHaveLength(0);
    await expect(as(db, users[0], "select dailycards.admin_import_cards('[]')")).rejects.toThrow("forbidden");
  });
});
