import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CARD_STATUS, CARD_TYPES, REPORT_CATEGORIES } from "@/lib/catalog";
import { decide } from "./actions";

type Report = {
  id: string;
  card_id: string;
  version: number;
  category: keyof typeof REPORT_CATEGORIES;
  text: string | null;
  source: string | null;
  priority: boolean;
};
type Card = {
  id: string;
  type: keyof typeof CARD_TYPES;
  status: keyof typeof CARD_STATUS;
  current_version: number;
  areas: { slug: string } | null;
  card_versions: { version: number; widget_text: string }[];
};

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase } = await requireAdmin();
  const { error } = await searchParams;
  const { data: reports } = await supabase
    .from("reports")
    .select("id, card_id, version, category, text, source, priority")
    .eq("status", "open")
    .order("priority", { ascending: false })
    .order("created_at");
  const flagged = await supabase.from("cards").select("id").in("status", ["in_review", "paused"]);
  const ids = [...new Set([...(reports ?? []).map((r) => r.card_id), ...(flagged.data ?? []).map((c) => c.id)])];
  const { data: cards } = ids.length
    ? await supabase
        .from("cards")
        .select("id, type, status, current_version, areas(slug), card_versions(version, widget_text)")
        .in("id", ids)
    : { data: [] };
  const byCard = new Map<string, Report[]>();
  for (const r of (reports ?? []) as Report[]) byCard.set(r.card_id, [...(byCard.get(r.card_id) ?? []), r]);
  const ordered = ((cards ?? []) as unknown as Card[]).sort(
    (a, b) =>
      Number(b.status === "paused") - Number(a.status === "paused") ||
      (byCard.get(b.id)?.length ?? 0) - (byCard.get(a.id)?.length ?? 0),
  );

  return (
    <div className="space-y-4">
      <p className="muted text-sm">
        Corrigir: edite o card (gera versão nova, marque “Atualizado com sugestões”) e depois clique em
        “Correção aplicada”. Quem sugeriu recebe e-mail quando a sugestão é aplicada.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ordered.length === 0 && <p className="text-sm">Fila vazia.</p>}
      {ordered.map((c) => {
        const text = c.card_versions.find((v) => v.version === c.current_version)?.widget_text;
        const list = byCard.get(c.id) ?? [];
        return (
          <article key={c.id} className="card space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="muted">
                {c.areas?.slug} · {CARD_TYPES[c.type]} · {CARD_STATUS[c.status]}
              </span>
              <Link href={`/admin/cards/${c.id}`} className="font-medium hover:underline">
                {text}
              </Link>
            </div>
            <ul className="space-y-1 text-sm">
              {list.map((r) => (
                <li key={r.id}>
                  {r.priority && "⚑ "}
                  <strong>{REPORT_CATEGORIES[r.category]}</strong> (v{r.version}){r.text ? `: ${r.text}` : ""}
                  {r.source && (
                    <a className="ml-1 underline" href={r.source} target="_blank" rel="noreferrer">
                      fonte
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <form action={decide} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="note" className="input max-w-sm" placeholder="Motivo (fica registrado)" />
              <button className="btn-ghost" name="decision" value="keep" type="submit">
                Manter
              </button>
              <button className="btn-ghost" name="decision" value="fix" type="submit">
                Correção aplicada
              </button>
              <button className="btn-ghost" name="decision" value="remove" type="submit">
                Remover
              </button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
