-- Seed de desenvolvimento: 16 profissões do MVP (camadas no Brasil), fontes de trend iniciais
-- e alguns cards de exemplo em Desenvolvimento de software.

insert into public.areas (slug, group_key, name_key, sort) values
  ('software', 'technology', 'area.software', 10),
  ('ia-aplicada', 'technology', 'area.applied_ai', 20),
  ('marketing-digital', 'business', 'area.digital_marketing', 30),
  ('social-media', 'business', 'area.social_media', 40),
  ('produto', 'business', 'area.product', 50),
  ('rh', 'business', 'area.hr', 60),
  ('corretor-imoveis', 'business', 'area.real_estate', 70),
  ('design-ux-ui', 'design', 'area.ux_ui', 80),
  ('professores', 'education', 'area.teachers', 90),
  ('odontologia', 'health', 'area.dentistry', 100),
  ('direito', 'law', 'area.law', 110),
  ('arquitetura', 'architecture_engineering', 'area.architecture', 120),
  ('engenharia-civil', 'architecture_engineering', 'area.civil_engineering', 130),
  ('nutricao', 'health', 'area.nutrition', 140),
  ('fisioterapia', 'health', 'area.physiotherapy', 150),
  ('educacao-fisica', 'health', 'area.physical_education', 160)
on conflict (slug) do nothing;

insert into public.area_countries (area_id, country, layer)
select a.id, 'BR', case when a.slug in (
  'direito', 'arquitetura', 'engenharia-civil', 'nutricao', 'fisioterapia', 'educacao-fisica'
) then 'career' else 'full' end
from public.areas a
on conflict do nothing;

-- Fontes primárias de trend (conferir e completar no admin antes de ligar o cron).
insert into public.trend_sources (area_id, country, url, label, reason)
select a.id, null, s.url, s.label, s.reason
from (values
  ('software', 'https://github.blog/changelog/feed/', 'GitHub Changelog', 'Lançamentos oficiais do GitHub'),
  ('software', 'https://nodejs.org/en/feed/blog.xml', 'Node.js Blog', 'Releases e segurança do Node.js'),
  ('software', 'https://devblogs.microsoft.com/typescript/feed/', 'TypeScript Blog', 'Releases oficiais do TypeScript'),
  ('ia-aplicada', 'https://openai.com/news/rss.xml', 'OpenAI News', 'Anúncios oficiais de modelos e APIs'),
  ('ia-aplicada', 'https://blog.google/technology/ai/rss/', 'Google AI Blog', 'Anúncios oficiais do Google sobre IA'),
  ('ia-aplicada', 'https://huggingface.co/blog/feed.xml', 'Hugging Face Blog', 'Modelos e ferramentas abertas'),
  ('marketing-digital', 'https://blog.google/products/ads-commerce/rss/', 'Google Ads & Commerce', 'Mudanças oficiais nas plataformas de anúncio')
) as s (slug, url, label, reason)
join public.areas a on a.slug = s.slug
on conflict do nothing;

-- Cards de exemplo (já publicados) para testar o app.
do $$
declare
  sw uuid := (select id from public.areas where slug = 'software');
  cid uuid;
  item record;
begin
  if exists (select 1 from public.cards where area_id = sw) then
    return;
  end if;
  for item in select * from (values
    (0, 'term', 'Idempotência: repetir a operação não muda o resultado após a 1ª vez',
     'Uma operação é idempotente quando executá-la várias vezes tem o mesmo efeito que executá-la uma vez. Em HTTP, GET, PUT e DELETE são idempotentes; POST não é. Na prática, isso permite repetir chamadas com segurança após timeout. Exemplo: um pagamento com chave de idempotência pode ser reenviado sem cobrar duas vezes.',
     null::jsonb, 'https://developer.mozilla.org/en-US/docs/Glossary/Idempotent', 'MDN Web Docs'),
    (0, 'tip', 'Rode EXPLAIN ANALYZE antes de criar um índice no escuro',
     'O EXPLAIN ANALYZE executa a consulta e mostra o plano real, com tempo e linhas por etapa. Procure Seq Scan em tabelas grandes e estimativas muito diferentes do real. Quando não usar: em consultas que alteram dados fora de uma transação com ROLLBACK, porque o ANALYZE executa de verdade.',
     null, 'https://www.postgresql.org/docs/current/sql-explain.html', 'Documentação do PostgreSQL'),
    (0, 'question', 'Qual status HTTP indica que um recurso foi criado?',
     'O 201 Created indica sucesso com criação de recurso; o ideal é devolver o header Location apontando para ele. O 200 é sucesso genérico, o 202 indica processamento assíncrono e o 204 é sucesso sem corpo.',
     '{"options": ["200 OK", "201 Created", "202 Accepted", "204 No Content"], "answer": 1}',
     'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/201', 'MDN Web Docs'),
    (1, 'term', 'Backpressure: o consumidor sinaliza que não dá conta do ritmo do produtor',
     'Backpressure é o mecanismo pelo qual quem consome dados avisa quem produz para desacelerar. Sem ele, buffers crescem até estourar a memória. Em streams do Node.js, write() devolve false quando o buffer enche e o evento drain avisa quando pode continuar.',
     null, 'https://nodejs.org/en/learn/modules/backpressuring-in-streams', 'Node.js Learn'),
    (1, 'tip', 'Toda chamada de rede precisa de timeout explícito',
     'Sem timeout, uma dependência lenta prende threads, conexões e memória até derrubar o serviço inteiro. Defina timeouts menores que o prazo de quem chama você e combine com retries limitados e backoff. Quando não usar retry: em operações não idempotentes sem chave de idempotência.',
     null, 'https://sre.google/sre-book/addressing-cascading-failures/', 'Google SRE Book'),
    (1, 'question', 'Qual nível de isolamento evita leitura suja mas permite leitura não repetível?',
     'No Read Committed, cada comando vê só dados confirmados, mas duas leituras na mesma transação podem ver valores diferentes se outra transação confirmar no meio. É o padrão do PostgreSQL.',
     '{"options": ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"], "answer": 1}',
     'https://www.postgresql.org/docs/current/transaction-iso.html', 'Documentação do PostgreSQL'),
    (2, 'term', 'Debounce: só executa depois que os eventos param de chegar por um tempo',
     'Debounce agrupa uma rajada de eventos e executa a função uma única vez, após um intervalo sem novos eventos. Exemplo: buscar sugestões só quando a pessoa para de digitar por 300 ms. Diferente de throttle, que executa no máximo uma vez a cada intervalo.',
     null, 'https://developer.mozilla.org/en-US/docs/Glossary/Debounce', 'MDN Web Docs')
  ) as t (seq, type, widget_text, body, question, source_url, source_label) loop
    insert into public.cards (area_id, layer, type, seq, status)
    values (sw, 'technical', item.type, item.seq, 'active')
    returning id into cid;
    insert into public.card_versions (card_id, version, locale, widget_text, body, question, source_url, source_label)
    values (cid, 1, 'pt-BR', item.widget_text, item.body, item.question, item.source_url, item.source_label);
  end loop;
end
$$;
