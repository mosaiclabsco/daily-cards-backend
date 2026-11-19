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

export async function fetchFeed(url: string, timeoutMs = 10000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "daily-cards-trends/1.0", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  if (body.length > 5_000_000) throw new Error("Feed grande demais");
  return parseFeed(body);
}
