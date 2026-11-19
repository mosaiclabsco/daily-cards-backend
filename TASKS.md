# Tasks

## Abertas

### Colocar Supabase e Vercel no ar
- Problema: só existe localmente; nada foi criado em Supabase, Vercel ou RevenueCat.
- O que fazer: seguir "Colocar no ar" do README (projeto sa-east-1, migrações + seed, Auth Google/Apple, admin, envs, webhook).
- Aceite: admin logado em produção; `get_track` respondendo para um usuário de teste; webhook do RevenueCat sandbox gravando `subscriptions`.

### Conferir fontes de trend
- Problema: as URLs de feed do seed foram escritas sem validação online.
- O que fazer: rodar "Buscar fontes agora" no admin, corrigir/desativar as com erro e completar fontes das outras profissões (CFO/Anvisa para Odontologia etc.).
- Aceite: toda profissão com pelo menos 2 fontes ativas sem erro.

### Ligar o app Expo ao backend
- Problema: `mobile/` ainda é o template do Expo com o cliente Supabase; nenhuma tela usa as RPCs.
- O que fazer: onboarding, tela Hoje, nota, sugestão, favoritos e exclusão de conta consumindo o contrato do `backend/README.md` (schema `dailycards`); `Purchases.logIn` com o UUID do Supabase.
- Aceite: fluxo completo funcionando contra o Supabase compartilhado.

### Pendências herdadas do setup do app
- Confirmar o ID do pacote Android (`co.mosaiclabs.dailycards` em `mobile/app.json`) antes do primeiro upload.
- Trocar as telas de exemplo do template (`mobile/src/app`).
- Widget Android (Glance) lendo o cache local; notificação local diária; RevenueCat (Google Play Billing, trial de 7 dias); analytics com os eventos do MVP.
- Teste fechado no Google Play (15 a 20 testadores, 14 dias) e ficha da loja.

### Produzir conteúdo de lançamento
- Problema: só há 7 cards de exemplo.
- O que fazer: `pnpm cards:generate` por profissão e tipo, importar, revisar fontes e publicar; 3 trends de folga por profissão.
- Aceite: ~90 dias de cards ativos por profissão lançada.

### Páginas públicas
- Problema: faltam termos de uso, política de privacidade (LGPD) e "Como revisamos o conteúdo".
- O que fazer: páginas públicas em `src/app/(public)/` linkadas no app.
- Aceite: URLs públicas prontas para a ficha da Play Store.

## Concluídas
