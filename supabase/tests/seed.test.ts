import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { createDb } from "./db";

it("seed aplica sem erro, com 16 profissões e cards dentro dos limites", async () => {
  const db = await createDb();
  const seed = await readFile(new URL("../seed.sql", import.meta.url), "utf8");
  await db.exec(seed);
  await db.exec(seed); // idempotente
  const areas = await db.query<{ n: number }>("select count(*)::int n from public.areas");
  expect(areas.rows[0].n).toBe(16);
  const career = await db.query<{ n: number }>("select count(*)::int n from public.area_countries where layer = 'career'");
  expect(career.rows[0].n).toBe(6);
  const long = await db.query("select * from public.card_versions where char_length(widget_text) > 80 or char_length(body) > 600");
  expect(long.rows).toEqual([]);
});
