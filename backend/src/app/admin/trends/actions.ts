"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { draftTrends, ingestTrends } from "@/lib/trends";

const s = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function approveTrend(form: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_approve_trend", {
    p_item: s(form, "item"),
    p_locale: "pt-BR",
    p_week_start: s(form, "week_start"),
    p_widget_text: s(form, "widget_text"),
    p_body: s(form, "body"),
    p_source_url: s(form, "source_url"),
    p_source_label: s(form, "source_label"),
    p_fact_date: s(form, "fact_date"),
  });
  if (error) redirect(`/admin/trends?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/trends");
  redirect("/admin/trends?approved=1");
}

export async function discardTrend(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_set_trend_status", { p_item: s(form, "item"), p_status: "discarded" });
  revalidatePath("/admin/trends");
}

// Roda a busca na hora (mesma rotina do cron). Admin checado antes de usar a service role.
export async function runTrendsNow() {
  await requireAdmin();
  const admin = createAdminClient();
  const ingest = await ingestTrends(admin);
  const draft = await draftTrends(admin);
  revalidatePath("/admin/trends");
  redirect(
    `/admin/trends?ran=${encodeURIComponent(
      `${ingest.inserted} itens novos, ${"drafted" in draft ? draft.drafted : 0} candidatos${ingest.failures.length ? `, ${ingest.failures.length} fontes com erro` : ""}`,
    )}`,
  );
}

export async function addSource(form: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("trend_sources").insert({
    area_id: s(form, "area"),
    url: s(form, "url"),
    label: s(form, "label"),
    reason: s(form, "reason"),
    country: s(form, "country") || null,
  });
  if (error) redirect(`/admin/trends?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/trends");
}

export async function toggleSource(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("trend_sources")
    .update({ active: s(form, "active") !== "true" })
    .eq("id", s(form, "id"));
  revalidatePath("/admin/trends");
}
