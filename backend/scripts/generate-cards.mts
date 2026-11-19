// Gera rascunhos de cards com a API do Claude e salva em generated/*.json para importar no admin.
// Uso: pnpm cards:generate --area software --type term --count 10 [--layer technical] [--seq 100]
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { DB_SCHEMA } from "../src/lib/supabase/schema.ts";
import { generateJson } from "../src/lib/ai.ts";
import { CONTENT_RULES } from "../src/lib/content-rules.ts";

const { values } = parseArgs({
  options: {
    area: { type: "string" },
    type: { type: "string" },
    count: { type: "string", default: "10" },
    layer: { type: "string" },
    seq: { type: "string" },
  },
});
const TYPES = ["term", "tip", "question"] as const;
if (!values.area || !TYPES.includes(values.type as (typeof TYPES)[number])) {
  console.error("Uso: --area <slug> --type term|tip|question [--count 10] [--layer technical|career] [--seq N]");
  process.exit(1);
}
const count = Math.min(Number(values.count), 30);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  db: { schema: DB_SCHEMA },
  auth: { persistSession: false },
});
const { data: area } = await supabase
  .from("areas")
  .select("id, slug, area_countries(layer)")
  .eq("slug", values.area)
  .single();
if (!area) throw new Error(`Profissão ${values.area} não existe`);
const full = area.area_countries.some((c: { layer: string }) => c.layer === "full");
const layer = values.layer ?? (full ? "technical" : "career");
if (layer === "technical" && !full) throw new Error("Profissão só tem a camada Carreira & Negócio");

// Evita repetir o que já existe na profissão.
const { data: existing } = await supabase
  .from("cards")
  .select("seq, card_versions(widget_text)")
  .eq("area_id", area.id)
  .eq("type", values.type);
const taken = (existing ?? []).flatMap((c) => c.card_versions.map((v: { widget_text: string }) => v.widget_text));
const startSeq = values.seq ? Number(values.seq) : Math.max(-1, ...(existing ?? []).map((c) => c.seq)) + 1;

const Card = z.object({
  widget_text: z.string(),
  body: z.string(),
  source_url: z.string(),
  source_label: z.string(),
  question: z.object({ options: z.array(z.string()), answer: z.number().int() }).nullable(),
});
const result = await generateJson({
  schema: z.object({ cards: z.array(Card) }),
  system: CONTENT_RULES,
  effort: "high",
  prompt: `Profissão: ${area.slug}. Camada: ${layer}. Tipo: ${values.type}.
Gere ${count} cards diferentes entre si, cobrindo temas variados da profissão, do mais útil no dia a dia ao mais avançado.
${values.type === "question" ? "Preencha question." : "question deve ser null."}
Não repita estes cards que já existem:
${taken.map((t) => `- ${t}`).join("\n") || "(nenhum)"}`,
});

const cards = result.cards.map((c, i) => ({
  area: area.slug,
  layer,
  type: values.type,
  seq: startSeq + i,
  locale: "pt-BR",
  widget_text: c.widget_text,
  body: c.body,
  question: values.type === "question" ? c.question : null,
  source_url: c.source_url,
  source_label: c.source_label,
}));
const tooLong = cards.filter((c) => c.widget_text.length > 80 || c.body.length > 600);
await mkdir("generated", { recursive: true });
const file = `generated/${area.slug}-${values.type}-${Date.now()}.json`;
await writeFile(file, JSON.stringify(cards, null, 2));
console.log(`${cards.length} rascunhos em ${file}. Confira as fontes antes de publicar.`);
if (tooLong.length) console.warn(`${tooLong.length} passam dos limites de 80/600 caracteres; ajuste na revisão.`);
