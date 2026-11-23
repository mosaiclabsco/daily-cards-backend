import { expect, it } from "vitest";
import { isPublicHttps, parseFeed } from "./feeds";

it("lê RSS 2.0", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title>Node 26</title><link>https://nodejs.org/a</link><description><![CDATA[<p>Novo <b>release</b></p>]]></description><pubDate>Tue, 10 Nov 2026 10:00:00 GMT</pubDate></item>
    <item><title>Sem https</title><link>http://x.dev</link></item>
  </channel></rss>`;
  expect(parseFeed(xml)).toEqual([
    { url: "https://nodejs.org/a", title: "Node 26", summary: "Novo release", publishedAt: "2026-11-10T10:00:00.000Z" },
  ]);
});

it("lê Atom com vários links", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
    <title type="html">Lançamento</title>
    <link rel="self" href="https://x.dev/self"/><link rel="alternate" href="https://x.dev/post"/>
    <updated>2026-11-11T00:00:00Z</updated><summary>Resumo</summary>
  </entry></feed>`;
  expect(parseFeed(xml)[0]).toMatchObject({ url: "https://x.dev/post", title: "Lançamento", summary: "Resumo" });
});

it("recusa XML com entidade declarada", () => {
  const xml = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">]><rss><channel><item><title>&b;</title><link>https://x.dev</link></item></channel></rss>`;
  expect(() => parseFeed(xml)).toThrow();
});

it("só busca feed em https público", () => {
  expect(isPublicHttps("https://kubernetes.io/feed.xml")).toBe(true);
  for (const bad of [
    "http://kubernetes.io/feed.xml",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://169.254.169.254/latest/meta-data",
    "https://10.0.0.5/x",
    "https://192.168.0.1/x",
    "https://[::1]/x",
    "https://user:pass@x.dev/feed",
    "file:///etc/passwd",
  ])
    expect(isPublicHttps(bad)).toBe(false);
});
