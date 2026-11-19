import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { CARD_STATUS, CARD_TYPES, LAYERS, REPORT_CATEGORIES, listAreas } from "@/lib/catalog";
import { saveCard, setStatus } from "../actions";

type Version = {
  version: number;
  locale: string;
  widget_text: string;
  body: string;
  question: { options: string[]; answer: number } | null;
  source_url: string;
  source_label: string;
  fact_date: string | null;
  community_updated: boolean;
};

export default async function CardEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const areas = await listAreas(supabase);
  const isNew = id === "new";

  let card: {
    id: string;
    area_id: string;
    layer: keyof typeof LAYERS;
    type: keyof typeof CARD_TYPES;
    status: keyof typeof CARD_STATUS;
    seq: number;
    current_version: number;
  } | null = null;
  let version: Version | null = null;
  let ratings: { score: number }[] = [];
  let reports: { id: string; category: keyof typeof REPORT_CATEGORIES; text: string | null; status: string }[] = [];

  if (!isNew) {
    const { data } = await supabase.from("cards").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    card = data;
    const [v, r, rp] = await Promise.all([
      supabase
        .from("card_versions")
        .select("*")
        .eq("card_id", id)
        .eq("version", data.current_version)
        .eq("locale", "pt-BR")
        .maybeSingle(),
      supabase.from("ratings").select("score").eq("card_id", id).eq("version", data.current_version),
      supabase
        .from("reports")
        .select("id, category, text, status")
        .eq("card_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    version = v.data;
    ratings = r.data ?? [];
    reports = rp.data ?? [];
  }

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(2)
    : "—";

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <form action={saveCard} className="space-y-3">
        <h1 className="text-lg font-semibold">{isNew ? "Novo card" : `Card · versão ${card!.current_version}`}</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Salvo.</p>}
        {card && card.status !== "draft" && (
          <p className="muted text-sm">
            Salvar um card publicado cria uma versão nova; as notas passam a contar do zero.
          </p>
        )}
        <input type="hidden" name="id" value={card?.id ?? ""} />
        <input type="hidden" name="locale" value="pt-BR" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-sm">
            Profissão
            <select name="area" className="input" defaultValue={card?.area_id} required>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Tipo
            <select name="type" className="input" defaultValue={card?.type ?? "term"}>
              {Object.entries(CARD_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Camada
            <select name="layer" className="input" defaultValue={card?.layer ?? "career"}>
              {Object.entries(LAYERS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Ordem na trilha
            <input name="seq" type="number" className="input" defaultValue={card?.seq ?? 0} />
          </label>
        </div>
        <label className="block text-sm">
          Texto do widget (até ~80)
          <input name="widget_text" className="input" maxLength={100} defaultValue={version?.widget_text} required />
        </label>
        <label className="block text-sm">
          Explicação (até ~600)
          <textarea name="body" rows={7} className="input" maxLength={1200} defaultValue={version?.body} required />
        </label>
        <fieldset className="card space-y-2">
          <legend className="px-1 text-sm">Só para pergunta</legend>
          <label className="block text-sm">
            Alternativas (uma por linha)
            <textarea name="options" rows={4} className="input" defaultValue={version?.question?.options.join("\n")} />
          </label>
          <label className="block text-sm">
            Índice da correta (começa em 0)
            <input name="answer" type="number" min={0} max={4} className="input w-24" defaultValue={version?.question?.answer ?? 0} />
          </label>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Fonte (URL https)
            <input name="source_url" type="url" className="input" defaultValue={version?.source_url} required />
          </label>
          <label className="text-sm">
            Nome da fonte
            <input name="source_label" className="input" defaultValue={version?.source_label} required />
          </label>
          <label className="text-sm">
            Data do fato (trend)
            <input name="fact_date" type="date" className="input" defaultValue={version?.fact_date ?? ""} />
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input name="community_updated" type="checkbox" defaultChecked={version?.community_updated} />
            Atualizado com sugestões da comunidade
          </label>
        </div>
        <button className="btn" type="submit">
          Salvar
        </button>
      </form>

      {card && (
        <aside className="space-y-4">
          <section className="card space-y-2 text-sm">
            <div>
              Status: <strong>{CARD_STATUS[card.status]}</strong>
            </div>
            <div>
              Nota da versão atual: {avg} ({ratings.length} notas)
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {(["active", "paused", "removed"] as const)
                .filter((s) => s !== card!.status && card!.status !== "removed")
                .map((s) => (
                  <form key={s} action={setStatus}>
                    <input type="hidden" name="id" value={card!.id} />
                    <input type="hidden" name="status" value={s} />
                    <button className="btn-ghost" type="submit">
                      {s === "active" ? "Publicar" : s === "paused" ? "Pausar" : "Remover"}
                    </button>
                  </form>
                ))}
            </div>
          </section>
          <section className="card text-sm">
            <h2 className="mb-2 font-medium">Sugestões</h2>
            {reports.length === 0 && <p className="muted">Nenhuma.</p>}
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <strong>{REPORT_CATEGORIES[r.category]}</strong> · {r.status}
                  {r.text && <p className="muted">{r.text}</p>}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      )}
    </div>
  );
}
