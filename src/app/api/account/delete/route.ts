import { createAdminClient } from "@/lib/supabase/server";

// Exclusão de conta pedida pelo app (exigência da App Store e direito da LGPD).
// O app manda o access token do Supabase; a identidade vem do token, nunca do corpo.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return new Response("unauthorized", { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return new Response("unauthorized", { status: 401 });
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return new Response("delete failed", { status: 500 });
  return new Response(null, { status: 204 });
}
