import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; denied?: string }>;
}) {
  const { error, denied } = await searchParams;
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-6 text-xl font-semibold">Admin · Daily Cards</h1>
      {error && <p className="mb-4 text-sm text-red-600">E-mail ou senha inválidos.</p>}
      {denied && <p className="mb-4 text-sm text-red-600">Esta conta não é administradora.</p>}
      <form action={signIn} className="space-y-3">
        <input className="input" name="email" type="email" placeholder="E-mail" required />
        <input className="input" name="password" type="password" placeholder="Senha" required />
        <button className="btn w-full justify-center" type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
