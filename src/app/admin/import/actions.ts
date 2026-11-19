"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export async function importCards(form: FormData) {
  const { supabase } = await requireAdmin();
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("json") ?? ""));
  } catch {
    redirect("/admin/import?error=JSON%20inv%C3%A1lido");
  }
  const { data, error } = await supabase.rpc("admin_import_cards", { p_cards: payload });
  if (error) redirect(`/admin/import?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/cards");
  redirect(`/admin/import?imported=${data}`);
}
