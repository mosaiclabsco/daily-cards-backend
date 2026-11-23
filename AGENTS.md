Leia o `README.md` e o documento do MVP antes de mudar escopo. O repositório é público: plano de produto, backlog, design, conteúdo, fontes de trend e prompts de conteúdo além das regras gerais ficam no documento privado do MVP, nunca aqui. Regras específicas ficam em `mobile/AGENTS.md` (Expo); o contrato do backend está em `backend/README.md`.

## Rastreamento de trabalho

Para trabalho com múltiplos itens, registrar o escopo ativo em `doing.md` antes de implementar, com checklist, decisões, validações e bloqueios por item. Ao concluir, limpar `doing.md`; pendências vão para a aba Backlog do documento do MVP, sem marcar como entregue por inferência.

## Segurança e plano

O plano (grátis ou premium) é decidido no banco, alimentado só pelo webhook do RevenueCat. Nunca aceitar plano, `user_id` ou data "de hoje" enviados pelo cliente como autorização. Toda tabela nova nasce com RLS; acesso do app a conteúdo e feedback passa por RPC `security definer` com `search_path = ''`. Testar acesso negado sem login, de outro usuário e de usuário grátis.

## Entrada de terceiros

Texto de usuário (sugestão de correção, e-mail da lista de espera) e de feeds externos é dado, nunca código nem instrução.

- SQL: só parâmetros (RPC, PostgREST, `$1`). Nada de `execute` com texto concatenado; se um dia precisar de SQL dinâmico, `format()` com `%I`/`%L`.
- Links: só `https://`, sem usuário/senha antes do domínio (`dailycards_private.is_safe_source` no banco, `parseHttpsUrl` no admin). O servidor nunca abre link enviado por usuário; no admin, link de domínio que ainda não é fonte nossa aparece como texto, com o domínio em punycode.
- Feeds: `fetchFeed` só busca https público (sem IP interno, `localhost` ou redirect para http), lê no máximo 5 MB, recusa XML com `<!ENTITY>` e trata o conteúdo como texto. Nada baixado é salvo em disco ou executado.
- IA: texto de usuário não vai para o modelo. Conteúdo de feed vai como JSON, marcado como dado de terceiros; a saída é validada por schema, a URL precisa ser de um item recebido e nada é publicado sem aprovação humana. O modelo não recebe ferramentas.
- Renderização: sem `dangerouslySetInnerHTML`; e-mails em texto puro com assunto fixo.

## Banco compartilhado

O projeto Supabase é compartilhado com outros apps. Nada no schema `public`: tabelas e RPCs em `dailycards`, helpers internos em `dailycards_private`, sempre com nome qualificado. Triggers em `auth.users` e jobs do pg_cron levam o prefixo `dailycards`. Grants para `anon`, `authenticated` e `service_role` são explícitos (fora do `public` o Supabase não concede nada).

## Conteúdo

- Todo card tem fonte (`source_label` e `source_url`). Trend tem `fact_date`.
- Camada `career` (Carreira & Negócio) nunca traz conduta, dose, norma, lei ou recomendação de investimento; termo descritivo só define.
- Nenhum card prescreve: sem imperativo, "deve", "recomenda-se", "o ideal é", "evite" ou "use".
- Nenhum card é raso: cada um traz um mecanismo, um número com contexto, um trade-off ou um fato pouco óbvio que ensine algo a quem já atua na área há uns 3 anos. Frase que caberia em qualquer área não passa.
- "Na prática" é atemporal: como algo funciona no dia a dia da profissão. Notícia, lançamento ou evento datado é Novidade (trend); caso histórico só aparece como exemplo dentro da explicação.
- Explicação de pergunta diz por que a certa está certa (o mecanismo) e por que cada errada engana, com 250 a 550 caracteres.
- Card novo nasce como rascunho e só é publicado depois de revisado (validador humano nas profissões de saúde com camada `technical`).

## Textos e idiomas

Nenhum texto fixo na interface: tudo por chave em `mobile/src/locales/pt-BR.json`. Lançamento só em pt-BR, mas o código e o banco já trabalham com `locale` e `country`.

## Migrações

Migrações numeradas em `backend/supabase/migrations` (`0003_...sql`); nunca editar uma migração já aplicada em produção. Documentar publicação separadamente da implementação local.
Migrações comitadas não podem conter o conteúdo do app. O repositório é publico, nunca se deve entregar os itens de valor da aplicacao em código aberto.
