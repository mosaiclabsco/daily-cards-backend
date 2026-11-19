import { beforeEach, describe, expect, it } from "vitest";
import { as, createDb, createUser, one, seedArea, seedCard, type Db } from "./db";

const FREE = "00000000-0000-4000-8000-000000000001";
const PREMIUM = "00000000-0000-4000-8000-000000000002";
const OTHER = "00000000-0000-4000-8000-000000000003";

type TrackItem = { day: string; type: string; widget_text: string; body: string | null; locked: boolean };

let db: Db;
let area: string;

async function today() {
  return (await db.query<{ d: string }>(
    "select to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD') d",
  )).rows[0].d;
}
async function shift(base: string, days: number) {
  return (await db.query<{ d: string }>("select to_char($1::date + $2::int, 'YYYY-MM-DD') d", [base, days]))
    .rows[0].d;
}
async function lastMonday(base: string) {
  return (await db.query<{ d: string }>(
    "select to_char($1::date - (extract(isodow from $1::date)::int - 1), 'YYYY-MM-DD') d",
    [base],
  )).rows[0].d;
}
async function follow(uid: string, areaId: string, startedOn?: string) {
  await as(db, uid, "select dailycards.follow_area($1)", [areaId]);
  if (startedOn)
    await db.query("update dailycards.user_areas set started_on = $3 where user_id = $1 and area_id = $2", [
      uid,
      areaId,
      startedOn,
    ]);
}
async function track(uid: string, areaId: string, from: string, to: string) {
  return (await one<TrackItem[]>(db, uid, "select dailycards.get_track($1, $2, $3)", [areaId, from, to])) as TrackItem[];
}

beforeEach(async () => {
  db = await createDb();
  await createUser(db, FREE);
  await createUser(db, PREMIUM, { premium: true });
  await createUser(db, OTHER);
  area = await seedArea(db, "software", "full");
  for (let i = 0; i < 3; i++) await seedCard(db, area, "term", i);
  for (let i = 0; i < 2; i++) await seedCard(db, area, "tip", i);
  for (let i = 0; i < 2; i++) await seedCard(db, area, "question", i);
});

describe("trilha por usuário", () => {
  it("segue a agenda semanal e anda pela posição pessoal, em ciclo", async () => {
    const start = await shift(await lastMonday(await today()), -14);
    await follow(PREMIUM, area, start);
    const items = await track(PREMIUM, area, start, await shift(start, 8));
    expect(items.map((i) => i.widget_text)).toEqual([
      "term 0", // seg
      "tip 0", // ter
      "question 0", // qua
      "term 1", // qui
      // sex: sem trend publicada → sem card
      "tip 1", // sáb
      "question 1", // dom
      "term 2", // seg
      "tip 0", // ter (ciclo)
    ]);
  });

  it("usuário que entra depois começa do primeiro card", async () => {
    const t = await today();
    await follow(PREMIUM, area, await shift(t, -30));
    await follow(FREE, area, t);
    const items = await track(FREE, area, t, t);
    // Sexta sem trend publicada não tem card; nos outros dias é o primeiro do tipo.
    for (const item of items) expect(item.widget_text.endsWith(" 0")).toBe(true);
  });

  it("sexta mostra a trend publicada para a semana", async () => {
    const monday = await shift(await lastMonday(await today()), -7);
    await follow(PREMIUM, area, monday);
    const trend = await seedCard(db, area, "trend", 0);
    await db.query("insert into dailycards.weekly_picks (area_id, locale, week_start, card_id) values ($1, 'pt-BR', $2, $3)", [
      area,
      monday,
      trend,
    ]);
    const friday = await shift(monday, 4);
    const [item] = await track(PREMIUM, area, friday, friday);
    expect(item.type).toBe("trend");
  });

  it("card técnico fica fora quando o país só tem a camada Carreira & Negócio", async () => {
    const law = await seedArea(db, "direito", "career");
    await seedCard(db, law, "term", 0, { layer: "technical" });
    await seedCard(db, law, "term", 1, { layer: "career" });
    const monday = await lastMonday(await today());
    await follow(PREMIUM, law, await shift(monday, -7));
    const items = await track(PREMIUM, law, await shift(monday, -7), await shift(monday, -7));
    expect(items[0].widget_text).toBe("term 1");
  });

  it("card pausado sai da rotação e o próximo do mesmo tipo assume", async () => {
    const monday = await shift(await lastMonday(await today()), -7);
    await follow(PREMIUM, area, monday);
    await db.query("update dailycards.cards set status = 'paused' where id = (select card_id from dailycards.card_versions where widget_text = 'term 0')");
    const [item] = await track(PREMIUM, area, monday, monday);
    expect(item.widget_text).toBe("term 1");
  });
});

describe("premium", () => {
  it("grátis vê só os últimos 3 dias e não vê a explicação da pergunta", async () => {
    const t = await today();
    await follow(FREE, area, await shift(t, -20));
    const items = await track(FREE, area, await shift(t, -20), t);
    expect(items.length).toBeLessThanOrEqual(3);
    expect(items.every((i) => i.day >= (items[0]?.day ?? t))).toBe(true);
    expect(items[0].day >= (await shift(t, -2))).toBe(true);
    for (const q of items.filter((i) => i.type === "question")) {
      expect(q.body).toBeNull();
      expect(q.locked).toBe(true);
    }
  });

  it("premium vê a explicação da pergunta", async () => {
    const monday = await shift(await lastMonday(await today()), -7);
    await follow(PREMIUM, area, monday);
    const items = await track(PREMIUM, area, monday, await shift(monday, 6));
    const q = items.find((i) => i.type === "question")!;
    expect(q.body).toContain("body question");
    expect(q.locked).toBe(false);
  });

  it("grátis segue só uma profissão; premium segue várias", async () => {
    const other = await seedArea(db, "produto");
    await follow(FREE, area);
    await expect(as(db, FREE, "select dailycards.follow_area($1)", [other])).rejects.toThrow("premium_required");
    await follow(PREMIUM, area);
    await follow(PREMIUM, other);
  });

  it("depois do downgrade só a profissão principal continua acessível", async () => {
    const other = await seedArea(db, "produto");
    await follow(PREMIUM, area);
    await follow(PREMIUM, other);
    await db.query("update dailycards.subscriptions set expires_at = now() - interval '1 minute'");
    const t = await today();
    await track(PREMIUM, area, t, t);
    await expect(track(PREMIUM, other, t, t)).rejects.toThrow("premium_required");
  });

  it("intervalo não passa de 14 dias à frente", async () => {
    const t = await today();
    await follow(PREMIUM, area, t);
    const items = await track(PREMIUM, area, t, await shift(t, 30));
    expect(items.at(-1)!.day <= (await shift(t, 14))).toBe(true);
  });
});

describe("isolamento", () => {
  it("não lê trilha de profissão que não segue", async () => {
    const t = await today();
    await expect(track(OTHER, area, t, t)).rejects.toThrow("area_not_followed");
  });

  it("usuário comum não lê tabelas de conteúdo direto", async () => {
    await follow(FREE, area);
    expect(await as(db, FREE, "select * from dailycards.cards")).toHaveLength(0);
    expect(await as(db, FREE, "select * from dailycards.card_versions")).toHaveLength(0);
  });

  it("só vê os próprios favoritos e notas", async () => {
    await follow(FREE, area);
    await follow(OTHER, area);
    const card = (await db.query<{ id: string }>("select id from dailycards.cards limit 1")).rows[0].id;
    await as(db, FREE, "select dailycards.toggle_favorite($1)", [card]);
    await as(db, FREE, "select dailycards.rate_card($1, 4)", [card]);
    expect(await as(db, OTHER, "select * from dailycards.favorites")).toHaveLength(0);
    expect(await as(db, OTHER, "select * from dailycards.ratings")).toHaveLength(0);
    expect(await as(db, FREE, "select * from dailycards.ratings")).toHaveLength(1);
  });

  it("não avalia card de profissão que não segue", async () => {
    const card = (await db.query<{ id: string }>("select id from dailycards.cards limit 1")).rows[0].id;
    await expect(as(db, OTHER, "select dailycards.rate_card($1, 5)", [card])).rejects.toThrow("card_not_found");
  });

  it("anônimo pega a amostra mas não a trilha", async () => {
    const sample = (await one<{ widget_text: string }>(db, null, "select dailycards.get_sample('software')")) as {
      widget_text: string;
    };
    expect(sample.widget_text).toBe("term 0");
    const t = await today();
    await expect(
      as(db, null, "select dailycards.get_track($1, $2, $3)", [area, t, t]),
    ).rejects.toThrow(/permission denied/);
  });

  it("usuário comum não chama RPC de admin", async () => {
    await expect(
      as(db, FREE, "select dailycards.admin_set_status($1, 'removed')", [
        (await db.query<{ id: string }>("select id from dailycards.cards limit 1")).rows[0].id,
      ]),
    ).rejects.toThrow("forbidden");
  });
});
