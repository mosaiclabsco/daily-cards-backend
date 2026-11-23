# Capturas de tela

Gera as capturas de cada versão (guardadas na aba Design do documento do MVP, fora do repositório), com o app rodando no web e um Supabase simulado (dados fixos de Desenvolvimento de software, usuário grátis). Serve para registrar a evolução visual sem depender de aparelho nem de backend.

```bash
pip install playwright && python3 -m playwright install chromium

# 1. Supabase simulado na porta 54399
python3 mobile/scripts/screenshots/mock-supabase.py &

# 2. App no web apontando para ele
cd mobile
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test npx expo start --web --port 8081

# 3. Em outro terminal, depois que o bundle carregar
python3 scripts/screenshots/shoot.py /tmp/capturas/v2
```

As capturas usam 390 × 844 (iPhone 14) e travam o relógio em datas fixas para mostrar um dia de termo e um de pergunta. No web as abas ficam no topo; no Android elas ficam embaixo.
