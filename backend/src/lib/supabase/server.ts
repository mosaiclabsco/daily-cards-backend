import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { DB_SCHEMA } from "./schema";

// Cliente com a sessão do usuário: RLS e RPCs decidem o que ele pode.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: DB_SCHEMA },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component: o proxy renova a sessão.
          }
        },
      },
    },
  );
}

// Service role: só para webhook, cron e exclusão de conta. Nunca a partir de dado do cliente sem checar.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY ausente");
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    db: { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
