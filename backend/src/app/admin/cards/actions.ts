"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

function text(form: FormData, key: string) {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function parseQuestion(form: FormData) {
  const options = String(form.get("options") ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  if (options.length === 0) return null;
  return { options, answer: Number(form.get("answer") ?? 0) };
}

export async function saveCard(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(form, "id");
  const type = text(form, "type");
  const { data, error } = await supabase.rpc("admin_save_card", {
    p_card: id,
    p_area: text(form, "area"),
    p_layer: text(form, "layer"),
    p_type: type,
    p_seq: Number(form.get("seq") ?? 0),
    p_locale: text(form, "locale") ?? "pt-BR",
    p_widget_text: text(form, "widget_text"),
    p_body: text(form, "body"),
    p_question: type === "question" ? parseQuestion(form) : null,
    p_source_url: text(form, "source_url"),
    p_source_label: text(form, "source_label"),
    p_fact_date: text(form, "fact_date"),
    p_community_updated: form.get("community_updated") === "on",
  });
  if (error) redirect(`/admin/cards/${id ?? "new"}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/cards");
  redirect(`/admin/cards/${data}?saved=1`);
}

export async function setStatus(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id"));
  const { error } = await supabase.rpc("admin_set_status", {
    p_card: id,
    p_status: String(form.get("status")),
  });
  if (error) redirect(`/admin/cards/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/cards");
  redirect(`/admin/cards/${id}?saved=1`);
}
