# Daily Cards — app (Expo)

App React Native com Expo Router (SDK 58). Fala direto com o Supabase no schema `dailycards`, pelo contrato descrito em [`../backend/README.md`](../backend/README.md#contrato-para-o-app-expo).

## Rodar

```bash
cp .env.example .env.local     # preencher Supabase e URL do backend
pnpm --filter @daily-cards/mobile start
```

Dependência nativa entra sempre com `pnpm --filter @daily-cards/mobile exec expo install <pacote>`.
Antes de dar uma tarefa por concluída: `pnpm --filter @daily-cards/mobile typecheck` e `pnpm --filter @daily-cards/mobile lint`.

## Telas

| Rota | Arquivo | O quê |
| --- | --- | --- |
| `/` | `(onboarding)/index.tsx` | Boas-vindas: o que a pessoa ganha, com uma prévia |
| `/area` | `(onboarding)/area.tsx` | Área (Saúde, Tecnologia…) em grade |
| `/profession` | `(onboarding)/profession.tsx` | Profissão dentro da área escolhida |
| `/relationship` | `(onboarding)/relationship.tsx` | Já atuo, Estou estudando ou Tenho curiosidade |
| `/preview` | `(onboarding)/preview.tsx` | Primeiro conhecimento (`get_sample`) antes da conta |
| `/waitlist` | `(onboarding)/waitlist.tsx` | "Minha profissão não está aqui" (`join_waitlist`) |
| `/sign-up`, `/sign-in`, `/forgot` | `(auth)/` | E-mail e senha, Google, Apple (só iOS) |
| `/auth/callback`, `/auth/reset` | `auth/` | Retorno do OAuth, confirmação de e-mail e nova senha |
| `/today`, `/explore`, `/saved`, `/profile` | `(app)/(tabs)/` | Hoje; Explorar (o que já saiu, por tipo: termos em ordem alfabética com busca, perguntas com acertou/errou); Salvos; Perfil (profissões, plano, conta) |
| `/card/[id]`, `/report/[cardId]` | `(app)/` | Card aberto e sugestão de correção |
| `/premium`, `/add-area` | `(app)/` | Oferta do premium e seguir outra profissão |

As guardas ficam em `src/app/_layout.tsx` (`Stack.Protected`): sem conta vê onboarding e login; logado sem profissão volta ao onboarding; logado com profissão vê as abas.
As escolhas do onboarding ficam no aparelho até a conta existir; no primeiro login, `src/providers/session.tsx` chama `save_profile` e `follow_area` com elas.

## Organização

- `src/lib/api.ts`: todas as chamadas ao Supabase e ao backend, com os códigos de erro das RPCs.
- `src/lib/auth.ts`: login (PKCE). As URLs `dailycards://auth/callback` e `dailycards://auth/reset` (e as do Expo Go/dev build, que o app gera com `Linking.createURL`) precisam estar em Authentication › URL Configuration › Redirect URLs no Supabase.
- `src/lib/storage.ts`: cache local da trilha (hoje-2 até hoje+14), base para o modo offline e para o widget.
- `src/lib/answers.ts`: respostas às perguntas guardadas no aparelho (acertou/errou em Explorar e ao reabrir).
- `src/constants/theme.ts` e `src/components/ui.tsx`: estilo B quente (aba Design do documento do MVP); ícones em `src/components/icon.tsx` (SF Symbols no iOS, Material Symbols no Android).
- `scripts/screenshots/`: capturas de tela no web com Supabase simulado.
- `src/locales/pt-BR.json`: todos os textos. Profissões e áreas usam as chaves `name_key` e `group_key` do banco.

## O que ainda falta

Widget Android (Glance) lendo o cache local, notificação diária, RevenueCat (`Purchases.logIn` com o id do Supabase) e analytics. Ver a aba Backlog do documento do MVP.
