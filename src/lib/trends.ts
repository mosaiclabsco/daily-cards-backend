import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateJson } from "./ai";
import { targetWeek } from "./catalog";
import { CONTENT_RULES } from "./content-rules";
import { fetchFeed } from "./feeds";

const MAX_AGE_DAYS = 14;

// Lê as fontes ativas e guarda itens dos últimos 14 dias (sem duplicar por profissão + URL).
export async function ingestTrends(admin: SupabaseClient, now = new Date()) {
  const { data: sources, error } = await admin
    .from("trend_sources")
    .select("id, area_id, url")
    .eq("active", true);
  if (error) throw error;
  const cutoff = now.getTime() - MAX_AGE_DAYS * 86_400_000;
  let inserted = 0;
  const failures: string[] = [];
  for (const source of sources ?? []) {
    try {
      const items = (await fetchFeed(source.url)).filter(
        (i) => i.publishedAt && new Date(i.publishedAt).getTime() >= cutoff,
      );
      if (items.length) {
        const { data, error: insertError } = await admin
          .from("trend_items")
          .upsert(
            items.map((i) => ({
              area_id: source.area_id,
              source_id: source.id,
              url: i.url,
              title: i.title.slice(0, 300),
              summary: i.summary,
              published_at: i.publishedAt,
            })),
            { onConflict: "area_id,url", ignoreDuplicates: true },
          )
          .select("id");
        if (insertError) throw insertError;
        inserted += data?.length ?? 0;
      }
      await admin
        .from("trend_sources")
        .update({ last_fetched_at: now.toISOString(), last_error: null })
        .eq("id", source.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      failures.push(`${source.url}: ${message}`);
      await admin.from("trend_sources").update({ last_error: message.slice(0, 500) }).eq("id", source.id);
    }
  }
  return { sources: sources?.length ?? 0, inserted, failures };
}

const Drafts = z.object({
  picks: z
    .array(
      z.object({
        url: z.string(),
        widget_text: z.string(),
        body: z.string(),
        fact_date: z.string().describe("YYYY-MM-DD"),
      }),
    )
    .max(3),
});

// A IA agrupa, descarta o irrelevante e rascunha até 3 candidatos por profissão. Nunca publica.
export async function draftTrends(admin: SupabaseClient, now = new Date()) {
  if (!process.env.ANTHROPIC_API_KEY) return { drafted: 0, skipped: "ANTHROPIC_API_KEY ausente" };
  const week = targetWeek(now);
  const { data: picks } = await admin.from("weekly_picks").select("area_id").eq("week_start", week);
  const picked = new Set((picks ?? []).map((p) => p.area_id));
  const { data: items, error } = await admin
    .from("trend_items")
    .select("id, area_id, url, title, summary, published_at, status, areas(slug, area_countries(layer))")
    .in("status", ["new", "candidate", "approved"])
    .gte("published_at", new Date(now.getTime() - MAX_AGE_DAYS * 86_400_000).toISOString());
  if (error) throw error;

  const byArea = new Map<string, typeof items>();
  for (const it of items ?? []) byArea.set(it.area_id, [...(byArea.get(it.area_id) ?? []), it]);

  let drafted = 0;
  for (const [areaId, list] of byArea) {
    // Já tem trend na semana ou candidatos esperando aprovação: não gasta outra chamada.
    if (picked.has(areaId) || list.some((i) => i.status === "candidate")) continue;
    const area = list[0].areas as unknown as { slug: string; area_countries: { layer: string }[] } | null;
    const careerOnly = area?.area_countries.every((c) => c.layer === "career") ?? true;
    const result = await generateJson({
      schema: Drafts,
      system: CONTENT_RULES,
      prompt: `Profissão: ${area?.slug}. Semana de ${week}.
${careerOnly ? "Esta profissão só tem a camada Carreira & Negócio: só mercado, ferramentas e carreira; nunca mudança de lei ou norma." : ""}
Itens das fontes oficiais (JSON):
${JSON.stringify(list.map((i) => ({ url: i.url, title: i.title, summary: i.summary, published_at: i.published_at })))}

Agrupe repetidos, descarte o irrelevante para o profissional e escolha até 3 candidatos a "trend da semana".
Para cada um, escreva um card do tipo trend. Use exatamente a URL do item; fact_date é a data do item.
Só o que foi anunciado; nada de boato ou "deve lançar". Texto próprio, nunca copiado.`,
    });
    const urls = new Set(list.map((i) => i.url));
    for (const pick of result.picks.filter((p) => urls.has(p.url))) {
      await admin
        .from("trend_items")
        .update({ status: "candidate", draft: pick })
        .eq("area_id", areaId)
        .eq("url", pick.url);
      drafted++;
    }
    await admin.from("trend_items").update({ status: "discarded" }).eq("area_id", areaId).eq("status", "new");
  }
  return { drafted };
}
