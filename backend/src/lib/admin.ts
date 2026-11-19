import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Checa sessão e papel de admin no banco. A UI esconde, mas quem barra é isto + as RPCs.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!admin) redirect("/login?denied=1");
  return { supabase, userId };
}
