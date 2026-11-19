import type { SupabaseClient } from "@supabase/supabase-js";

export const CARD_TYPES = { term: "Termo", tip: "Dica", question: "Pergunta", trend: "Trend" } as const;
export const CARD_STATUS = {
  draft: "Rascunho",
  active: "No ar",
  in_review: "Em revisão (no ar)",
  paused: "Pausado",
  removed: "Removido",
} as const;
export const LAYERS = { technical: "Técnica", career: "Carreira & Negócio" } as const;
export const REPORT_CATEGORIES = {
  incorrect: "Informação incorreta",
  outdated: "Desatualizada",
  incomplete: "Incompleta",
  confusing: "Confusa",
  context: "Depende do contexto",
} as const;

export type Area = { id: string; slug: string; name_key: string; group_key: string };

export async function listAreas(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("areas")
    .select("id, slug, name_key, group_key")
    .order("sort");
  if (error) throw error;
  return data as Area[];
}

// Segunda-feira da semana de uma data (YYYY-MM-DD), em UTC.
export function weekStart(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Semana que a trend aprovada hoje vai preencher: de sexta em diante já é a próxima.
export function targetWeek(now: Date) {
  const monday = weekStart(now);
  return (now.getUTCDay() || 7) >= 5 ? addDays(monday, 7) : monday;
}
