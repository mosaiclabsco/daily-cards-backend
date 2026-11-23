import { expect, it } from "vitest";
import { hostsOf, isKnownHost, parseHttpsUrl } from "./urls";

it("aceita https comum", () => {
  expect(parseHttpsUrl(" https://sre.google/sre-book/ ")).toEqual({ href: "https://sre.google/sre-book/", host: "sre.google" });
});

it("recusa outros esquemas, usuário antes do domínio e espaços", () => {
  for (const bad of [
    "http://x.dev",
    "javascript:alert(1)",
    "data:text/html,oi",
    "file:///etc/passwd",
    "https://banco.com@golpe.com/login",
    "https://x.dev/a b",
    "https://x.dev/\u0000",
    "Livro de periodontia, cap. 3",
  ])
    expect(parseHttpsUrl(bad)).toBeNull();
});

it("mostra domínio de outro alfabeto em punycode", () => {
  expect(parseHttpsUrl("https://gооgle.com")?.host).toMatch(/^xn--/);
});

it("domínio conhecido inclui subdomínio, não sufixo parecido", () => {
  const known = hostsOf(["https://www.kubernetes.io/blog", "https://sre.google/x"]);
  expect(isKnownHost("kubernetes.io", known)).toBe(true);
  expect(isKnownHost("docs.kubernetes.io", known)).toBe(true);
  expect(isKnownHost("kubernetes.io.golpe.com", known)).toBe(false);
  expect(isKnownHost("fakekubernetes.io", known)).toBe(false);
});
