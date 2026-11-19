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

### Combinar contrato com o app Expo
- Problema: o app do Igor (`mosaiclabs/daily-cards`) tem `apps/web` e `supabase` próprios; este repo passa a ser a fonte do backend.
- O que fazer: remover/ignorar o supabase do monorepo dele e consumir as RPCs do README; `Purchases.logIn` com o UUID do Supabase.
- Aceite: onboarding, trilha, nota, sugestão, favoritos e exclusão de conta funcionando contra este backend.

### Produzir conteúdo de lançamento
- Problema: só há 7 cards de exemplo.
- O que fazer: `pnpm cards:generate` por profissão e tipo, importar, revisar fontes e publicar; 3 trends de folga por profissão.
- Aceite: ~90 dias de cards ativos por profissão lançada.

### Páginas públicas
- Problema: faltam termos de uso, política de privacidade (LGPD) e "Como revisamos o conteúdo".
- O que fazer: páginas públicas em `src/app/(public)/` linkadas no app.
- Aceite: URLs públicas prontas para a ficha da Play Store.

## Concluídas
