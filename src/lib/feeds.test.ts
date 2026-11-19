import { expect, it } from "vitest";
import { parseFeed } from "./feeds";

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
