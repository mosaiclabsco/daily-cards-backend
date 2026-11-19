import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { addDays, listAreas, weekStart } from "@/lib/catalog";

async function count(query: PromiseLike<{ count: number | null }>) {
  return (await query).count ?? 0;
}

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const head = { count: "exact" as const, head: true };
  const nextWeek = weekStart(new Date());
  const [drafts, inReview, paused, openReports, candidates, waitlist, areas, picks] =
    await Promise.all([
      count(supabase.from("cards").select("id", head).eq("status", "draft")),
      count(supabase.from("cards").select("id", head).eq("status", "in_review")),
      count(supabase.from("cards").select("id", head).eq("status", "paused")),
      count(supabase.from("reports").select("id", head).eq("status", "open")),
      count(supabase.from("trend_items").select("id", head).eq("status", "candidate")),
      count(supabase.from("waitlist").select("id", head)),
      listAreas(supabase),
      supabase.from("weekly_picks").select("area_id").eq("week_start", nextWeek),
    ]);
  const withPick = new Set((picks.data ?? []).map((p) => p.area_id));
  const missing = areas.filter((a) => !withPick.has(a.id));

  const tiles = [
    ["Rascunhos", drafts, "/admin/cards?status=draft"],
    ["Em revisão", inReview, "/admin/review"],
    ["Pausados", paused, "/admin/review"],
    ["Sugestões abertas", openReports, "/admin/review"],
    ["Candidatos de trend", candidates, "/admin/trends"],
    ["Lista de espera", waitlist, "/admin/waitlist"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map(([label, value, href]) => (
          <Link key={label} href={href} className="card hover:opacity-80">
            <div className="muted text-sm">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </Link>
        ))}
      </div>
      <section className="card">
        <h2 className="mb-2 font-medium">
          Trend da semana de {nextWeek} (sexta {addDays(nextWeek, 4)})
        </h2>
        {missing.length === 0 ? (
          <p className="text-sm">Todas as profissões têm trend publicada.</p>
        ) : (
          <p className="text-sm">
            Sem trend: {missing.map((a) => a.slug).join(", ")}.{" "}
            <Link className="underline" href="/admin/trends">
              Aprovar
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
