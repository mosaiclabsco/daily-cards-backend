import type { SupabaseClient } from "@supabase/supabase-js";

// Banco compartilhado com outros apps: tudo do Daily Cards fica no schema "dailycards".
export const DB_SCHEMA = "dailycards";

// Cliente apontado para o schema dailycards (com sessão do usuário ou service role).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = SupabaseClient<any, any, any>;
