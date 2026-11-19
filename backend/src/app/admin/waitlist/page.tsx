import { requireAdmin } from "@/lib/admin";

export default async function WaitlistPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("waitlist")
    .select("id, email, profession, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const byProfession = new Map<string, number>();
  for (const w of data ?? []) {
    const key = w.profession.toLowerCase();
    byProfession.set(key, (byProfession.get(key) ?? 0) + 1);
  }
  return (
    <div className="space-y-4">
      <section className="card text-sm">
        <h2 className="mb-2 font-medium">Mais pedidas</h2>
        <ol className="list-decimal pl-5">
          {[...byProfession.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([p, n]) => (
              <li key={p}>
                {p} · {n}
              </li>
            ))}
        </ol>
      </section>
      <table className="w-full text-sm">
        <tbody>
          {(data ?? []).map((w) => (
            <tr key={w.id} className="border-t" style={{ borderColor: "var(--line)" }}>
              <td className="py-1">{w.email}</td>
              <td>{w.profession}</td>
              <td className="muted">{new Date(w.created_at).toLocaleDateString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
