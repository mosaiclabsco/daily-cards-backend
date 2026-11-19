# Daily Cards (nome provisório)

App de conhecimento diário por profissão: um card por dia no widget, trends com fonte, nota e sugestão de correção, paywall por assinatura. Lançamento no Android, em pt-BR, com código e dados prontos para outros países.

Documento do MVP: https://claude.ai/artifact/4jMVU5CVyc3acZixbxdp2q

## Estrutura

| Pasta | O quê | Deploy |
| --- | --- | --- |
| `backend/` | Supabase (migrações, RLS, RPCs, seed, testes) + Next.js: admin, webhook do RevenueCat, crons, exclusão de conta | Vercel, Root Directory `backend`, região `pdx1` |
| `mobile/` | App Expo (React Native, Expo Router). Fala direto com o Supabase | EAS Build/Submit (lojas) e EAS Update |

O banco é compartilhado com outros apps por enquanto: tudo do Daily Cards fica nos schemas `dailycards` e `dailycards_private`, e todo cliente Supabase usa `db: { schema: "dailycards" }`. O contrato de RPCs está em [`backend/README.md`](backend/README.md#contrato-para-o-app-expo).

## Primeiros passos

```bash
pnpm install                 # workspace pnpm (node-linker=hoisted por causa do Expo)

cp backend/.env.example backend/.env.local
cp mobile/.env.example mobile/.env.local

pnpm test                    # testes do banco (PGlite) e unitários do backend
pnpm backend                 # admin em http://localhost:3000/admin
pnpm android                 # app no emulador/aparelho Android
```

No app, dependência nativa entra sempre com `pnpm --filter @daily-cards/mobile exec expo install <pacote>`.

## Decisões já tomadas

- **Pacote Android:** `co.mosaiclabs.dailycards`. Não muda depois de publicado no Google Play; confirmar antes do primeiro upload.
- **Dados do app:** catálogo de profissões é público por RLS; cards e feedback só por RPC. Limites do plano grátis são aplicados no banco, nunca só na interface.
- **Premium:** só via webhook do RevenueCat gravando `subscriptions`; o app nunca informa o próprio plano.
- **Conta Google Play pessoal:** primeiro lançamento exige teste fechado com 12+ testadores por 14 dias seguidos.

Backlog em [`TASKS.md`](TASKS.md).
