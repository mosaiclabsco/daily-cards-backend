"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export async function decide(form: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_review", {
    p_card: String(form.get("id")),
    p_decision: String(form.get("decision")),
    p_note: String(form.get("note") ?? ""),
  });
  if (error) redirect(`/admin/review?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/review");
  redirect("/admin/review");
}
