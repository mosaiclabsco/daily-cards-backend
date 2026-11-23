-- Seed de desenvolvimento: 19 profissões do MVP (camadas no Brasil) e cards de exemplo genéricos
-- em Desenvolvimento de software.

insert into dailycards.areas (slug, group_key, name_key, sort) values
  ('software', 'technology', 'area.software', 10),
  ('inteligencia-artificial', 'technology', 'area.artificial_intelligence', 20),
  ('infraestrutura', 'technology', 'area.infrastructure', 24),
  ('cloud-devops', 'technology', 'area.cloud_devops', 27),
  ('ciberseguranca', 'technology', 'area.cybersecurity', 28),
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

insert into dailycards.area_countries (area_id, country, layer)
select a.id, 'BR', case when a.slug in (
  'direito', 'arquitetura', 'engenharia-civil', 'nutricao', 'fisioterapia', 'educacao-fisica'
) then 'career' else 'full' end
from dailycards.areas a
on conflict do nothing;

-- Fontes de trend não ficam no repositório: são cadastradas no admin (Trends › Fontes).

-- Cards de exemplo (já publicados), só para rodar o app localmente. Conteúdo real entra pelo admin.
do $$
declare
  sw uuid := (select id from dailycards.areas where slug = 'software');
  cid uuid;
  item record;
begin
  if exists (select 1 from dailycards.cards where area_id = sw) then
    return;
  end if;
  for item in select * from (values
    (0, 'term', 'Termo de exemplo 1',
     'Texto de exemplo para rodar o app localmente. O conteúdo de verdade não fica no repositório.',
     null::jsonb, 'https://example.com/', 'Fonte de exemplo'),
    (0, 'tip', 'Na prática de exemplo 1',
     'Texto de exemplo para rodar o app localmente. O conteúdo de verdade não fica no repositório.',
     null, 'https://example.com/', 'Fonte de exemplo'),
    (0, 'question', 'Pergunta de exemplo 1: qual opção está certa?',
     'Texto de exemplo para rodar o app localmente. O conteúdo de verdade não fica no repositório.',
     '{"options": ["Opção A", "Opção B", "Opção C"], "answer": 1}', 'https://example.com/', 'Fonte de exemplo'),
    (1, 'term', 'Termo de exemplo 2',
     'Texto de exemplo para rodar o app localmente. O conteúdo de verdade não fica no repositório.',
     null, 'https://example.com/', 'Fonte de exemplo'),
    (1, 'tip', 'Na prática de exemplo 2',
     'Texto de exemplo para rodar o app localmente. O conteúdo de verdade não fica no repositório.',
     null, 'https://example.com/', 'Fonte de exemplo'),
    (1, 'question', 'Pergunta de exemplo 2: qual opção está certa?',
     'Texto de exemplo para rodar o app localmente. O conteúdo de verdade não fica no repositório.',
     '{"options": ["Opção A", "Opção B", "Opção C"], "answer": 1}', 'https://example.com/', 'Fonte de exemplo'),
    (2, 'term', 'Termo de exemplo 3',
     'Texto de exemplo para rodar o app localmente. O conteúdo de verdade não fica no repositório.',
     null, 'https://example.com/', 'Fonte de exemplo')
  ) as t (seq, type, widget_text, body, question, source_url, source_label) loop
    insert into dailycards.cards (area_id, layer, type, seq, status)
    values (sw, 'technical', item.type, item.seq, 'active')
    returning id into cid;
    insert into dailycards.card_versions (card_id, version, locale, widget_text, body, question, source_url, source_label)
    values (cid, 1, 'pt-BR', item.widget_text, item.body, item.question, item.source_url, item.source_label);
  end loop;
end
$$;
