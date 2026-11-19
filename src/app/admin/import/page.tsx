import { importCards } from "./actions";

const EXAMPLE = `[
  {
    "area": "software",
    "layer": "technical",
    "type": "term",
    "seq": 10,
    "widget_text": "…",
    "body": "…",
    "source_url": "https://…",
    "source_label": "…"
  }
]`;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; imported?: string }>;
}) {
  const { error, imported } = await searchParams;
  return (
    <form action={importCards} className="space-y-3">
      <h1 className="text-lg font-semibold">Importar rascunhos</h1>
      <p className="muted text-sm">
        Cole o JSON gerado por <code>pnpm cards:generate</code>. Tudo entra como rascunho; publique
        depois de revisar em Cards.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {imported && <p className="text-sm text-green-600">{imported} rascunhos importados.</p>}
      <textarea name="json" rows={18} className="input font-mono" placeholder={EXAMPLE} required />
      <button className="btn" type="submit">
        Importar
      </button>
    </form>
  );
}
