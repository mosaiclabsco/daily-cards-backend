import { XMLParser } from "fast-xml-parser";

export type FeedItem = { url: string; title: string; summary: string | null; publishedAt: string | null };

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function text(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>))
    return text((value as Record<string, unknown>)["#text"]);
  return null;
}

function stripHtml(value: string | null, max = 1000) {
  if (!value) return null;
  const plain = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return plain.slice(0, max) || null;
}

function date(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function list<T>(value: T | T[] | undefined): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

function atomLink(link: unknown): string | null {
  for (const l of list(link as Record<string, string> | Record<string, string>[])) {
    if (typeof l === "string") return l;
    if (!l["@_rel"] || l["@_rel"] === "alternate") return l["@_href"] ?? null;
  }
  return null;
}

// Lê RSS 2.0 e Atom. Ignora itens sem link https.
export function parseFeed(xml: string): FeedItem[] {
  // Entidade declarada no próprio XML (<!ENTITY …>) é o caminho do "billion laughs" e de XXE: recusa.
  if (/<!ENTITY/i.test(xml)) throw new Error("Feed com entidade declarada");
  const doc = parser.parse(xml);
  const items: FeedItem[] = [];
  for (const it of list(doc?.rss?.channel?.item)) {
    items.push({
      url: text(it.link) ?? "",
      title: text(it.title) ?? "",
      summary: stripHtml(text(it.description) ?? text(it["content:encoded"])),
      publishedAt: date(it.pubDate ?? it["dc:date"]),
    });
  }
  for (const it of list(doc?.feed?.entry)) {
    items.push({
      url: atomLink(it.link) ?? "",
      title: text(it.title) ?? "",
      summary: stripHtml(text(it.summary) ?? text(it.content)),
      publishedAt: date(it.published ?? it.updated),
    });
  }
  return items.filter((i) => i.url.startsWith("https://") && i.title);
}

const MAX_BYTES = 5_000_000;
const MAX_REDIRECTS = 3;

// Só https em todos os saltos (redirect para http ou IP interno não passa), corpo com teto de 5 MB
// lido aos poucos, e o resultado só é lido como texto: nada é salvo em disco nem executado.
export async function fetchFeed(url: string, timeoutMs = 10000) {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = url;
  for (let hop = 0; ; hop++) {
    if (!isPublicHttps(current)) throw new Error("URL fora da regra (só https público)");
    const res = await fetch(current, {
      signal,
      redirect: "manual",
      headers: { "user-agent": "daily-cards-trends/1.0", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next || hop >= MAX_REDIRECTS) throw new Error(`Redirect demais ou sem destino (${res.status})`);
      current = new URL(next, current).href;
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseFeed(await readLimited(res, MAX_BYTES));
  }
}

export function isPublicHttps(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return false;
  // IP literal: só aceita se não for privado, loopback, link-local (inclui 169.254.169.254) ou IPv6.
  if (h.startsWith("[")) return false;
  const ip = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127))
      return false;
  }
  return true;
}

async function readLimited(res: Response, max: number) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error("Feed grande demais");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
