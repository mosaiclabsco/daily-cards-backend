import { requireAdmin } from "@/lib/admin";
import { addDays, listAreas, targetWeek } from "@/lib/catalog";
import { addSource, approveTrend, discardTrend, runTrendsNow, toggleSource } from "./actions";

type Item = {
  id: string;
  area_id: string;
  url: string;
  title: string;
  published_at: string | null;
  draft: { widget_text: string; body: string; fact_date: string } | null;
  trend_sources: { label: string } | null;
};

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; approved?: string; ran?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error, approved, ran } = await searchParams;
  const week = targetWeek(new Date());
  const [areas, items, sources, picks] = await Promise.all([
    listAreas(supabase),
    supabase
      .from("trend_items")
      .select("id, area_id, url, title, published_at, draft, trend_sources(label)")
      .eq("status", "candidate")
      .order("published_at", { ascending: false }),
    supabase.from("trend_sources").select("id, area_id, url, label, active, last_error, last_fetched_at").order("label"),
    supabase.from("weekly_picks").select("area_id").eq("week_start", week),
  ]);
  const slug = new Map(areas.map((a) => [a.id, a.slug]));
  const picked = new Set((picks.data ?? []).map((p) => p.area_id));
  const candidates = (items.data ?? []) as unknown as Item[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">
          Trend da semana {week} (sexta {addDays(week, 4)})
        </h1>
        <form action={runTrendsNow} className="ml-auto">
          <button className="btn-ghost" type="submit">
            Buscar fontes agora
          </button>
        </form>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {approved && <p className="text-sm text-green-600">Trend publicada.</p>}
      {ran && <p className="text-sm">{ran}</p>}
      <p className="muted text-sm">
        Antes de aprovar: abra o link, confira se o resumo diz o que a fonte diz, confira a data e
        corte exageros. A IA só sugere; nada vai ao ar sem aprovação.
      </p>
      <p className="text-sm">
        Sem trend nesta semana:{" "}
        {areas.filter((a) => !picked.has(a.id)).map((a) => a.slug).join(", ") || "nenhuma"}
      </p>

      {candidates.length === 0 && <p className="muted text-sm">Nenhum candidato.</p>}
      {candidates.map((c) => (
        <article key={c.id} className="card space-y-2">
          <div className="text-sm">
            <span className="muted">{slug.get(c.area_id)} · {c.trend_sources?.label} · </span>
            <a className="underline" href={c.url} target="_blank" rel="noreferrer">
              {c.title}
            </a>
            {picked.has(c.area_id) && <span className="muted"> · já tem trend nesta semana</span>}
          </div>
          <form action={approveTrend} className="space-y-2">
            <input type="hidden" name="item" value={c.id} />
            <input type="hidden" name="source_url" value={c.url} />
            <input type="hidden" name="source_label" value={c.trend_sources?.label ?? "Fonte"} />
            <input name="widget_text" className="input" maxLength={100} defaultValue={c.draft?.widget_text} required />
            <textarea name="body" rows={4} className="input" maxLength={1200} defaultValue={c.draft?.body} required />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label>
                Data do fato{" "}
                <input name="fact_date" type="date" className="input w-auto" defaultValue={c.draft?.fact_date ?? c.published_at?.slice(0, 10)} required />
              </label>
              <label>
                Semana{" "}
                <input name="week_start" type="date" className="input w-auto" defaultValue={week} required />
              </label>
              <button className="btn" type="submit">
                Aprovar e publicar
              </button>
              <button className="btn-ghost" formAction={discardTrend} type="submit">
                Descartar
              </button>
            </div>
          </form>
        </article>
      ))}

      <section className="card space-y-3">
        <h2 className="font-medium">Fontes</h2>
        <table className="w-full text-sm">
          <tbody>
            {(sources.data ?? []).map((s) => (
              <tr key={s.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="py-1">{slug.get(s.area_id)}</td>
                <td>{s.label}</td>
                <td className="muted max-w-xs truncate">{s.url}</td>
                <td className="text-red-600">{s.last_error}</td>
                <td>
                  <form action={toggleSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(s.active)} />
                    <button className="btn-ghost" type="submit">
                      {s.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={addSource} className="grid gap-2 md:grid-cols-5">
          <select name="area" className="input" required>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.slug}
              </option>
            ))}
          </select>
          <input name="label" className="input" placeholder="Nome" required />
          <input name="url" type="url" className="input" placeholder="URL do feed (https)" required />
          <input name="reason" className="input" placeholder="Por que esta fonte" required />
          <button className="btn justify-center" type="submit">
            Adicionar fonte
          </button>
        </form>
      </section>
    </div>
  );
}
