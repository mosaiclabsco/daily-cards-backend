Leia o `README.md` e o documento do MVP antes de mudar escopo. Regras específicas ficam em `mobile/AGENTS.md` (Expo); o contrato do backend está em `backend/README.md`.

## Rastreamento de trabalho

Para trabalho com múltiplos itens, registrar o escopo ativo em `doing.md` antes de implementar, com checklist, decisões, validações e bloqueios por item. Ao concluir, limpar `doing.md`; pendências ficam em `TASKS.md`, sem marcar como entregue por inferência.

## Segurança e plano

O plano (grátis ou premium) é decidido no banco, alimentado só pelo webhook do RevenueCat. Nunca aceitar plano, `user_id` ou data "de hoje" enviados pelo cliente como autorização. Toda tabela nova nasce com RLS; acesso do app a conteúdo e feedback passa por RPC `security definer` com `search_path = ''`. Testar acesso negado sem login, de outro usuário e de usuário grátis.

## Banco compartilhado

O projeto Supabase é compartilhado com outros apps. Nada no schema `public`: tabelas e RPCs em `dailycards`, helpers internos em `dailycards_private`, sempre com nome qualificado. Triggers em `auth.users` e jobs do pg_cron levam o prefixo `dailycards`. Grants para `anon`, `authenticated` e `service_role` são explícitos (fora do `public` o Supabase não concede nada).

## Conteúdo

- Todo card tem fonte (`source_label` e `source_url`). Trend tem `fact_date`.
- Camada `career` (Carreira & Negócio) nunca traz conduta, dose, norma, lei ou recomendação de investimento; termo descritivo só define.
- Nenhum card prescreve: sem imperativo, "deve", "recomenda-se", "o ideal é", "evite" ou "use".
- Card novo nasce como rascunho e só é publicado depois de revisado (validador humano nas profissões de saúde com camada `technical`).

## Textos e idiomas

Nenhum texto fixo na interface: tudo por chave em `mobile/src/locales/pt-BR.json`. Lançamento só em pt-BR, mas o código e o banco já trabalham com `locale` e `country`.

## Migrações

Migrações numeradas em `backend/supabase/migrations` (`0003_...sql`); nunca editar uma migração já aplicada em produção. Documentar publicação separadamente da implementação local.
