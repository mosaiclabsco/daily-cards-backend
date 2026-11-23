// Links que vêm de fora (sugestão de usuário, item de feed). Nada aqui abre o link.

export type SafeUrl = { href: string; host: string };

// Só https, sem usuário/senha antes do domínio. O host sai em punycode (xn--…),
// então domínio com letra parecida de outro alfabeto aparece diferente do original.
export function parseHttpsUrl(raw: string | null | undefined): SafeUrl | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!/^https:\/\//i.test(value) || /[\s\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return null;
  return { href: url.href, host: url.hostname.toLowerCase() };
}

// Domínio conhecido = já usado como fonte de card ou de trend. Subdomínio conta.
export function isKnownHost(host: string, known: Set<string>) {
  const parts = host.split(".");
  for (let i = 0; i < parts.length - 1; i++) if (known.has(parts.slice(i).join("."))) return true;
  return false;
}

export function hostsOf(urls: (string | null | undefined)[]) {
  const set = new Set<string>();
  for (const u of urls) {
    const parsed = parseHttpsUrl(u);
    if (parsed) set.add(parsed.host.replace(/^www\./, ""));
  }
  return set;
}
