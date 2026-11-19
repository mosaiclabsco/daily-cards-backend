import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CARD_STATUS, CARD_TYPES, LAYERS, listAreas } from "@/lib/catalog";

type Row = {
  id: string;
  type: keyof typeof CARD_TYPES;
  layer: keyof typeof LAYERS;
  status: keyof typeof CARD_STATUS;
  seq: number;
  current_version: number;
  areas: { slug: string } | null;
  card_versions: { version: number; locale: string; widget_text: string }[];
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; status?: string; type?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const filters = await searchParams;
  const areas = await listAreas(supabase);
  let query = supabase
    .from("cards")
    .select("id, type, layer, status, seq, current_version, areas(slug), card_versions(version, locale, widget_text)")
    .order("area_id")
    .order("type")
    .order("seq")
    .limit(300);
  if (filters.area) query = query.eq("area_id", filters.area);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.type) query = query.eq("type", filters.type);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <form className="flex flex-wrap gap-2">
          <select name="area" defaultValue={filters.area ?? ""} className="input w-auto">
            <option value="">Todas as profissões</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.slug}
              </option>
            ))}
          </select>
          <select name="type" defaultValue={filters.type ?? ""} className="input w-auto">
            <option value="">Todos os tipos</option>
            {Object.entries(CARD_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={filters.status ?? ""} className="input w-auto">
            <option value="">Todos os status</option>
            {Object.entries(CARD_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="btn-ghost" type="submit">
            Filtrar
          </button>
        </form>
        <Link href="/admin/cards/new" className="btn ml-auto">
          Novo card
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead className="muted text-left">
          <tr>
            <th className="py-2">Profissão</th>
            <th>Tipo</th>
            <th>Seq</th>
            <th>Texto do widget</th>
            <th>Camada</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const current = r.card_versions.find((v) => v.version === r.current_version);
            return (
              <tr key={r.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="py-2">{r.areas?.slug}</td>
                <td>{CARD_TYPES[r.type]}</td>
                <td>{r.seq}</td>
                <td>
                  <Link className="hover:underline" href={`/admin/cards/${r.id}`}>
                    {current?.widget_text ?? "—"}
                  </Link>
                </td>
                <td>{LAYERS[r.layer]}</td>
                <td>{CARD_STATUS[r.status]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted text-sm">Nenhum card.</p>}
    </div>
  );
}
