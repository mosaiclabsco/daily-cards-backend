# daily-cards-backend

Backend (Supabase) e admin web (Next.js na Vercel) do app de cards diários.
O app Expo fica em `mosaiclabs/daily-cards` e fala direto com o Supabase via RLS + RPCs.

## Estrutura

- `supabase/migrations/` — schema, RLS e RPCs (`0001_init.sql`) e agendamento pg_cron (`0002_cron.sql`).
- `supabase/seed.sql` — 16 profissões com camada no Brasil, fontes de trend iniciais e 7 cards de exemplo (Desenvolvimento de software).
- `supabase/tests/` — testes do banco em PGlite (sem Docker).
- `src/app/admin/` — painel: cards, revisão, trends, importar, lista de espera.
- `src/app/api/` — webhook RevenueCat, exclusão de conta, crons (trends e e-mails).
- `scripts/generate-cards.mts` — gera rascunhos com a API do Claude.

## Regras que o banco garante

| Recurso | Grátis | Premium | Onde é checado |
| --- | --- | --- | --- |
| Card do dia (trilha) | Sim | Sim | `get_track` |
| Dias anteriores | Últimos 3 dias | Desde que começou | `get_track` |
| Explicação da pergunta | Bloqueada (`locked: true`) | Sim | `card_json` |
| Profissões seguidas | 1 | Todas | `follow_area`; depois do downgrade só a primeira fica acessível |
| Favoritos | Últimos 3 dias | Todos | `list_favorites` |
| Nota e sugestão de correção | Sim | Sim | `rate_card`, `report_card` (limite de 20 por dia) |
| Admin | — | — | tabela `admins` + `private.require_admin()` em toda RPC `admin_*` |

Premium só vem da tabela `subscriptions`, escrita pelo webhook do RevenueCat com o estado confirmado na API REST dele. O app nunca informa o próprio plano.
O widget roda com o cache local do app, então o bloqueio do widget para quem é grátis é feito no app.

### Trilha por usuário

O card de cada dia sai da posição do usuário na sequência da profissão (`user_areas.started_on`), seguindo a agenda fixa (seg termo, ter dica, qua pergunta, qui termo, sex trend, sáb dica, dom pergunta). Quem entra depois começa do primeiro card. Ao acabar os cards de um tipo, a sequência recomeça. Card pausado ou removido sai da rotação e o próximo do mesmo tipo assume.
A trend é global: um card por profissão e semana (`weekly_picks`), mostrado na sexta.

## Contrato para o app (Expo)

Cliente Supabase com a publishable key e a sessão do usuário (Supabase Auth: e-mail e senha, Google, Apple).

| Chamada | Quem | Uso |
| --- | --- | --- |
| `from('areas').select()` / `from('area_countries').select()` | anon | Lista de profissões no onboarding |
| `rpc('get_sample', { p_area_slug, p_locale, p_country })` | anon | Card de amostra antes da conta |
| `rpc('join_waitlist', { p_email, p_profession, p_locale })` | anon | "Minha profissão não está aqui" |
| `rpc('save_profile', { p_relationship, p_locale, p_country, p_timezone })` | usuário | Depois do cadastro (`works`, `studies`, `curious`; fuso IANA) |
| `rpc('follow_area', { p_area })` / `rpc('unfollow_area', { p_area })` | usuário | Erro `premium_required` na 2ª profissão sem premium |
| `rpc('get_track', { p_area, p_from, p_to })` | usuário | Cache do widget: `hoje-2` até `hoje+14` (no máximo 31 dias por chamada) |
| `rpc('rate_card', { p_card, p_score })` | usuário | 1 a 5; muda a nota se repetir |
| `rpc('report_card', { p_card, p_category, p_text, p_source })` | usuário | `incorrect`, `outdated`, `incomplete`, `confusing`, `context` |
| `rpc('toggle_favorite', { p_card })` / `rpc('list_favorites')` | usuário | Favoritos |
| `from('subscriptions').select()` | usuário | Só o próprio status |
| `POST /api/account/delete` com `Authorization: Bearer <access_token>` | usuário | Excluir conta |

`get_track` devolve uma lista de `{ day, card_id, area_id, version, type, layer, widget_text, body, locked, question, source_url, source_label, fact_date, community_updated, my_rating, favorited }`.
No RevenueCat, o app chama `Purchases.logIn(<id do usuário no Supabase>)` e o entitlement se chama `premium`.

## Rodar local

```bash
pnpm install
cp .env.example .env.local   # preencher
pnpm test                    # banco em PGlite + unitários
pnpm dev                     # admin em http://localhost:3000/admin
```

Gerar rascunhos: `pnpm cards:generate --area software --type term --count 10`, depois colar o JSON em Admin › Importar, revisar e publicar.

## Colocar no ar

1. **Supabase**: criar o projeto em `us-west-2` (Oregon; app global, funções da Vercel em `pdx1`). Aplicar `supabase/migrations/*.sql` em ordem (SQL editor ou `supabase db push`) e depois `supabase/seed.sql`.
2. **Auth**: ativar confirmação de e-mail, Google e Apple. Configurar o e-mail de recuperação de senha.
3. **Admin**: criar o usuário em Authentication e rodar `insert into public.admins (user_id) values ('<uuid>');`.
4. **Vercel**: importar o repositório e cadastrar as variáveis do `.env.example`. Os crons estão em `vercel.json` (diários, compatíveis com o plano Hobby).
5. **pg_cron**: as regras de feedback rodam de hora em hora pela migração `0002_cron.sql`. Conferir em Database › Cron Jobs.
6. **RevenueCat**: entitlement `premium`; webhook para `https://<domínio>/api/webhooks/revenuecat` com o header `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`; chave secreta v1 em `REVENUECAT_SECRET_API_KEY`.
