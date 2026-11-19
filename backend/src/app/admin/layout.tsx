import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { signOut } from "../login/actions";

const NAV = [
  ["/admin", "Visão geral"],
  ["/admin/cards", "Cards"],
  ["/admin/review", "Revisão"],
  ["/admin/trends", "Trends"],
  ["/admin/import", "Importar"],
  ["/admin/waitlist", "Lista de espera"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-4 border-b pb-4" style={{ borderColor: "var(--line)" }}>
        <strong>Daily Cards</strong>
        <nav className="flex flex-wrap gap-3 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="hover:underline">
              {label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="ml-auto">
          <button className="btn-ghost" type="submit">
            Sair
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
