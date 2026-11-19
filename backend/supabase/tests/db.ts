import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

// Banco de teste em memória com o mínimo do Supabase (auth.users, auth.uid, papéis) + migrações reais.
export async function createDb() {
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create role anon; create role authenticated; create role service_role;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, dir), "utf8"));
  }
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;

// Executa como usuário autenticado (ou anon), com RLS e grants valendo.
export async function as<T = Record<string, unknown>>(
  db: Db,
  uid: string | null,
  sql: string,
  params: unknown[] = [],
) {
  await db.exec(
    `select set_config('test.uid', '${uid ?? ""}', false); set role ${uid ? "authenticated" : "anon"};`,
  );
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role; select set_config('test.uid', '', false);");
  }
}

export async function one<T>(db: Db, uid: string | null, sql: string, params: unknown[] = []) {
  const rows = await as<Record<string, T>>(db, uid, sql, params);
  return Object.values(rows[0])[0];
}

export async function createUser(db: Db, id: string, opts: { admin?: boolean; premium?: boolean } = {}) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id.slice(-4)}@t.dev`]);
  if (opts.admin) await db.query("insert into dailycards.admins (user_id) values ($1)", [id]);
  if (opts.premium)
    await db.query(
      "insert into dailycards.subscriptions (user_id, active, expires_at) values ($1, true, now() + interval '30 days')",
      [id],
    );
}

// Cria card publicado direto (como superusuário), devolvendo o id.
export async function seedCard(
  db: Db,
  area: string,
  type: string,
  seq: number,
  opts: { layer?: string; status?: string; question?: unknown; fact?: string } = {},
) {
  const { rows } = await db.query<{ id: string }>(
    "insert into dailycards.cards (area_id, layer, type, seq, status) values ($1, $2, $3, $4, $5) returning id",
    [area, opts.layer ?? "career", type, seq, opts.status ?? "active"],
  );
  const id = rows[0].id;
  const question =
    type === "question" ? (opts.question ?? { options: ["a", "b"], answer: 0 }) : null;
  await db.query(
    `insert into dailycards.card_versions (card_id, version, locale, widget_text, body, question, source_url, source_label, fact_date)
     values ($1, 1, 'pt-BR', $2, $3, $4, 'https://example.com', 'Fonte', $5)`,
    [id, `${type} ${seq}`, `body ${type} ${seq}`, question, opts.fact ?? (type === "trend" ? "2026-11-10" : null)],
  );
  return id;
}

export async function seedArea(db: Db, slug: string, layer: "full" | "career" = "career") {
  const { rows } = await db.query<{ id: string }>(
    "insert into dailycards.areas (slug, group_key, name_key) values ($1, 'tech', $1) returning id",
    [slug],
  );
  await db.query("insert into dailycards.area_countries values ($1, 'BR', $2)", [rows[0].id, layer]);
  return rows[0].id;
}
