-- Daily cards: schema inicial.
-- O app nativo fala direto com o Supabase. Tabelas de conteúdo não têm leitura direta para
-- usuários comuns: tudo passa por RPCs security definer que aplicam trilha, camada e premium.

create schema if not exists dailycards;
create schema if not exists dailycards_private;

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

create table dailycards.areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  group_key text not null check (group_key ~ '^[a-z0-9_]{2,40}$'),
  name_key text not null check (char_length(name_key) between 2 and 80),
  parent_id uuid references dailycards.areas (id),
  kind text not null default 'profession' check (kind in ('profession', 'specialty')),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- Disponibilidade e camada por país: 'full' = técnica + carreira; 'career' = só Carreira & Negócio.
create table dailycards.area_countries (
  area_id uuid not null references dailycards.areas (id) on delete cascade,
  country text not null check (country ~ '^[A-Z]{2}$'),
  layer text not null check (layer in ('full', 'career')),
  primary key (area_id, country)
);

-- ---------------------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------------------

create table dailycards.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  relationship text check (relationship in ('works', 'studies', 'curious')),
  locale text not null default 'pt-BR' check (locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  country text not null default 'BR' check (country ~ '^[A-Z]{2}$'),
  timezone text not null default 'America/Sao_Paulo' check (char_length(timezone) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profissões seguidas. started_on ancora a trilha pessoal: o card de cada dia sai da posição
-- do usuário na sequência, não de uma agenda global.
create table dailycards.user_areas (
  user_id uuid not null references dailycards.profiles (id) on delete cascade,
  area_id uuid not null references dailycards.areas (id),
  started_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, area_id)
);

create table dailycards.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Estado de assinatura vindo do RevenueCat (webhook + consulta REST). Único lugar que concede premium.
create table dailycards.subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement text not null default 'premium',
  active boolean not null default false,
  expires_at timestamptz,
  period_type text,
  store text,
  product_id text,
  will_renew boolean,
  synced_at timestamptz not null default now(),
  primary key (user_id, entitlement)
);

create table dailycards.revenuecat_events (
  id text primary key,
  type text not null,
  app_user_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table dailycards.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  profession text not null check (char_length(profession) between 2 and 120),
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now()
);
create unique index waitlist_email_profession on dailycards.waitlist (lower(email), lower(profession));

-- ---------------------------------------------------------------------------
-- Conteúdo
-- ---------------------------------------------------------------------------

create table dailycards.cards (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references dailycards.areas (id),
  layer text not null check (layer in ('technical', 'career')),
  type text not null check (type in ('term', 'tip', 'question', 'trend')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'in_review', 'paused', 'removed')),
  seq integer not null default 0,
  current_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_rotation on dailycards.cards (area_id, type, status, seq);

create table dailycards.card_versions (
  card_id uuid not null references dailycards.cards (id) on delete cascade,
  version integer not null check (version > 0),
  locale text not null check (locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  widget_text text not null check (char_length(widget_text) between 1 and 100),
  body text not null check (char_length(body) between 1 and 1200),
  question jsonb,
  source_url text not null check (source_url ~ '^https://' and char_length(source_url) <= 500),
  source_label text not null check (char_length(source_label) between 1 and 120),
  fact_date date,
  community_updated boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (card_id, version, locale)
);

-- Trend da semana: um card por profissão, idioma e semana (segunda-feira). Aparece na sexta.
create table dailycards.weekly_picks (
  area_id uuid not null references dailycards.areas (id),
  locale text not null,
  week_start date not null check (extract(isodow from week_start) = 1),
  card_id uuid not null references dailycards.cards (id),
  approved_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  primary key (area_id, locale, week_start)
);

create table dailycards.favorites (
  user_id uuid not null references dailycards.profiles (id) on delete cascade,
  card_id uuid not null references dailycards.cards (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------

create table dailycards.ratings (
  card_id uuid not null references dailycards.cards (id) on delete cascade,
  version integer not null,
  user_id uuid not null references dailycards.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (card_id, version, user_id)
);

create table dailycards.reports (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references dailycards.cards (id) on delete cascade,
  version integer not null,
  user_id uuid references dailycards.profiles (id) on delete set null,
  category text not null
    check (category in ('incorrect', 'outdated', 'incomplete', 'confusing', 'context')),
  text text check (char_length(text) <= 2000),
  source text check (source is null or (source ~ '^https?://' and char_length(source) <= 500)),
  priority boolean not null default false,
  status text not null default 'open' check (status in ('open', 'applied', 'dismissed')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_open on dailycards.reports (card_id, version) where status = 'open';
create index reports_user_recent on dailycards.reports (user_id, created_at);

create table dailycards.reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references dailycards.cards (id) on delete cascade,
  version integer not null,
  decision text not null check (decision in ('fix', 'keep', 'remove')),
  note text,
  reviewer uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz not null default now()
);

create table dailycards.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template text not null check (template in ('report_applied')),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_outbox_pending on dailycards.email_outbox (created_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Trends
-- ---------------------------------------------------------------------------

create table dailycards.trend_sources (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references dailycards.areas (id) on delete cascade,
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  kind text not null default 'feed' check (kind in ('feed')),
  url text not null check (url ~ '^https://'),
  label text not null,
  reason text not null,
  active boolean not null default true,
  last_fetched_at timestamptz,
  last_error text,
  unique (area_id, url)
);

create table dailycards.trend_items (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references dailycards.areas (id) on delete cascade,
  source_id uuid references dailycards.trend_sources (id) on delete set null,
  url text not null,
  title text not null,
  summary text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  status text not null default 'new'
    check (status in ('new', 'candidate', 'discarded', 'approved')),
  draft jsonb,
  unique (area_id, url)
);
create index trend_items_queue on dailycards.trend_items (area_id, status, published_at desc);

-- ---------------------------------------------------------------------------
-- Funções internas
-- ---------------------------------------------------------------------------

create function dailycards_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from dailycards.admins a where a.user_id = auth.uid())
$$;

create function dailycards_private.is_premium(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from dailycards.subscriptions s
    where s.user_id = p_user and s.entitlement = 'premium' and s.active
      and (s.expires_at is null or s.expires_at > now())
  )
$$;

create function dailycards_private.user_today(p_user uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce(
    (select p.timezone from dailycards.profiles p where p.id = p_user), 'America/Sao_Paulo'))::date
$$;

-- Profissão principal: a primeira seguida. Sem premium, só ela fica acessível (cobre downgrade).
create function dailycards_private.primary_area(p_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select ua.area_id from dailycards.user_areas ua
  where ua.user_id = p_user order by ua.created_at, ua.area_id limit 1
$$;

create function dailycards_private.can_access_area(p_user uuid, p_area uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from dailycards.user_areas ua where ua.user_id = p_user and ua.area_id = p_area)
    and (dailycards_private.is_premium(p_user) or dailycards_private.primary_area(p_user) = p_area)
$$;

-- Agenda semanal fixa: seg termo, ter dica, qua pergunta, qui termo, sex trend, sáb dica, dom pergunta.
create function dailycards_private.slot_type(p_day date) returns text
language sql immutable set search_path = '' as $$
  select case extract(isodow from p_day)::int
    when 1 then 'term' when 2 then 'tip' when 3 then 'question' when 4 then 'term'
    when 5 then 'trend' when 6 then 'tip' else 'question' end
$$;

-- k-ésimo card elegível (em ciclo) de um tipo para profissão, idioma e país.
create function dailycards_private.nth_card(p_area uuid, p_type text, p_locale text, p_country text, p_k integer)
returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  n integer;
  v uuid;
begin
  select count(*) into n
  from dailycards.cards c
  where c.area_id = p_area and c.type = p_type and c.status in ('active', 'in_review')
    and (c.layer = 'career' or exists (
      select 1 from dailycards.area_countries ac
      where ac.area_id = p_area and ac.country = p_country and ac.layer = 'full'))
    and exists (
      select 1 from dailycards.card_versions cv
      where cv.card_id = c.id and cv.version = c.current_version and cv.locale = p_locale);
  if n = 0 then
    return null;
  end if;
  select c.id into v
  from dailycards.cards c
  where c.area_id = p_area and c.type = p_type and c.status in ('active', 'in_review')
    and (c.layer = 'career' or exists (
      select 1 from dailycards.area_countries ac
      where ac.area_id = p_area and ac.country = p_country and ac.layer = 'full'))
    and exists (
      select 1 from dailycards.card_versions cv
      where cv.card_id = c.id and cv.version = c.current_version and cv.locale = p_locale)
  order by c.seq, c.id
  offset (p_k % n) limit 1;
  return v;
end
$$;

-- Card do dia na trilha do usuário. Trend é global por semana; o resto anda pela posição pessoal.
create function dailycards_private.track_card(
  p_area uuid, p_locale text, p_country text, p_started date, p_day date
) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  t text := dailycards_private.slot_type(p_day);
  k integer;
  v uuid;
begin
  if p_day < p_started then
    return null;
  end if;
  if t = 'trend' then
    select wp.card_id into v
    from dailycards.weekly_picks wp join dailycards.cards c on c.id = wp.card_id
    where wp.area_id = p_area and wp.locale = p_locale and wp.week_start = p_day - 4
      and c.status in ('active', 'in_review');
    return v;
  end if;
  select count(*) into k
  from generate_series(p_started::timestamp, (p_day - 1)::timestamp, interval '1 day') g
  where dailycards_private.slot_type(g::date) = t;
  return dailycards_private.nth_card(p_area, t, p_locale, p_country, k);
end
$$;

create function dailycards_private.card_json(
  p_card uuid, p_locale text, p_user uuid, p_premium boolean, p_day date
) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'day', p_day,
    'card_id', c.id,
    'area_id', c.area_id,
    'version', c.current_version,
    'type', c.type,
    'layer', c.layer,
    'widget_text', v.widget_text,
    'body', case when c.type = 'question' and not p_premium then null else v.body end,
    'locked', c.type = 'question' and not p_premium,
    'question', v.question,
    'source_url', v.source_url,
    'source_label', v.source_label,
    'fact_date', v.fact_date,
    'community_updated', v.community_updated,
    'my_rating', (
      select r.score from dailycards.ratings r
      where r.card_id = c.id and r.version = c.current_version and r.user_id = p_user),
    'favorited', exists (
      select 1 from dailycards.favorites f where f.card_id = c.id and f.user_id = p_user)
  )
  from dailycards.cards c
  join dailycards.card_versions v
    on v.card_id = c.id and v.version = c.current_version and v.locale = p_locale
  where c.id = p_card
$$;

create function dailycards_private.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return uid;
end
$$;

create function dailycards_private.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
begin
  if not dailycards_private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return uid;
end
$$;

create function dailycards_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into dailycards.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end
$$;

create trigger dailycards_on_auth_user_created after insert on auth.users
for each row execute function dailycards_private.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs do app
-- ---------------------------------------------------------------------------

create function dailycards.save_profile(
  p_relationship text, p_locale text, p_country text, p_timezone text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
begin
  if p_relationship is not null and p_relationship not in ('works', 'studies', 'curious') then
    raise exception 'invalid_relationship' using errcode = '22023';
  end if;
  if p_timezone is not null
     and not exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = p_timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  update dailycards.profiles p set
    relationship = coalesce(p_relationship, p.relationship),
    locale = coalesce(p_locale, p.locale),
    country = coalesce(p_country, p.country),
    timezone = coalesce(p_timezone, p.timezone),
    updated_at = now()
  where p.id = uid;
end
$$;

create function dailycards.follow_area(p_area uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  if not exists (select 1 from dailycards.areas a where a.id = p_area and a.active) then
    raise exception 'area_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from dailycards.user_areas ua where ua.user_id = uid and ua.area_id = p_area) then
    return;
  end if;
  if not dailycards_private.is_premium(uid)
     and exists (select 1 from dailycards.user_areas ua where ua.user_id = uid) then
    raise exception 'premium_required' using errcode = 'P0001';
  end if;
  insert into dailycards.user_areas (user_id, area_id, started_on)
  values (uid, p_area, dailycards_private.user_today(uid));
end
$$;

create function dailycards.unfollow_area(p_area uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
begin
  delete from dailycards.user_areas ua where ua.user_id = uid and ua.area_id = p_area;
end
$$;

-- Cards de um intervalo da trilha (ex.: hoje-2 até hoje+14 para o cache do widget).
-- Sem premium: só os últimos 3 dias para trás e explicação da pergunta bloqueada.
create function dailycards.get_track(p_area uuid, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
  prof dailycards.profiles;
  ua dailycards.user_areas;
  premium boolean;
  today date;
  d date;
  cid uuid;
  result jsonb := '[]'::jsonb;
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  if p_to - p_from > 31 then
    raise exception 'range_too_large' using errcode = '22023';
  end if;
  select * into ua from dailycards.user_areas x where x.user_id = uid and x.area_id = p_area;
  if not found then
    raise exception 'area_not_followed' using errcode = '42501';
  end if;
  if not dailycards_private.can_access_area(uid, p_area) then
    raise exception 'premium_required' using errcode = 'P0001';
  end if;
  select * into prof from dailycards.profiles p where p.id = uid;
  premium := dailycards_private.is_premium(uid);
  today := dailycards_private.user_today(uid);
  p_to := least(p_to, today + 14);
  p_from := greatest(p_from, ua.started_on, case when premium then ua.started_on else today - 2 end);
  d := p_from;
  while d <= p_to loop
    cid := dailycards_private.track_card(p_area, prof.locale, prof.country, ua.started_on, d);
    if cid is not null then
      result := result || jsonb_build_array(dailycards_private.card_json(cid, prof.locale, uid, premium, d));
    end if;
    d := d + 1;
  end loop;
  return result;
end
$$;

-- Amostra do onboarding (antes da conta): primeiro termo da profissão.
create function dailycards.get_sample(
  p_area_slug text, p_locale text default 'pt-BR', p_country text default 'BR'
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  a uuid;
  cid uuid;
begin
  select x.id into a from dailycards.areas x where x.slug = p_area_slug and x.active;
  if a is null then
    return null;
  end if;
  cid := dailycards_private.nth_card(a, 'term', p_locale, p_country, 0);
  if cid is null then
    return null;
  end if;
  return dailycards_private.card_json(cid, p_locale, null, false, null);
end
$$;

create function dailycards.rate_card(p_card uuid, p_score integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
  c dailycards.cards;
begin
  if p_score is null or p_score not between 1 and 5 then
    raise exception 'invalid_score' using errcode = '22023';
  end if;
  select * into c from dailycards.cards x where x.id = p_card and x.status in ('active', 'in_review');
  if not found or not dailycards_private.can_access_area(uid, c.area_id) then
    raise exception 'card_not_found' using errcode = 'P0002';
  end if;
  insert into dailycards.ratings (card_id, version, user_id, score)
  values (c.id, c.current_version, uid, p_score)
  on conflict (card_id, version, user_id)
  do update set score = excluded.score, updated_at = now();
end
$$;

create function dailycards.report_card(
  p_card uuid, p_category text, p_text text, p_source text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
  c dailycards.cards;
  rid uuid;
begin
  if p_category not in ('incorrect', 'outdated', 'incomplete', 'confusing', 'context') then
    raise exception 'invalid_category' using errcode = '22023';
  end if;
  select * into c from dailycards.cards x where x.id = p_card and x.status in ('active', 'in_review');
  if not found or not dailycards_private.can_access_area(uid, c.area_id) then
    raise exception 'card_not_found' using errcode = 'P0002';
  end if;
  if (select count(*) from dailycards.reports r
      where r.user_id = uid and r.created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into dailycards.reports (card_id, version, user_id, category, text, source, priority)
  values (c.id, c.current_version, uid, p_category, nullif(trim(p_text), ''),
          nullif(trim(p_source), ''), c.type = 'trend' or p_category = 'incorrect')
  returning id into rid;
  return rid;
end
$$;

create function dailycards.toggle_favorite(p_card uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
  c dailycards.cards;
begin
  select * into c from dailycards.cards x where x.id = p_card and x.status in ('active', 'in_review');
  if not found or not dailycards_private.can_access_area(uid, c.area_id) then
    raise exception 'card_not_found' using errcode = 'P0002';
  end if;
  delete from dailycards.favorites f where f.user_id = uid and f.card_id = p_card;
  if found then
    return false;
  end if;
  insert into dailycards.favorites (user_id, card_id) values (uid, p_card);
  return true;
end
$$;

-- Favoritos: completo no premium, últimos 3 dias no grátis.
create function dailycards.list_favorites() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
  premium boolean := dailycards_private.is_premium(uid);
  loc text;
begin
  select p.locale into loc from dailycards.profiles p where p.id = uid;
  return coalesce((
    select jsonb_agg(dailycards_private.card_json(f.card_id, loc, uid, premium, null) order by f.created_at desc)
    from dailycards.favorites f join dailycards.cards c on c.id = f.card_id
    where f.user_id = uid
      and c.status in ('active', 'in_review')
      and dailycards_private.can_access_area(uid, c.area_id)
      and (premium or f.created_at > now() - interval '3 days')
      and dailycards_private.card_json(f.card_id, loc, uid, premium, null) is not null
  ), '[]'::jsonb);
end
$$;

create function dailycards.join_waitlist(p_email text, p_profession text, p_locale text default 'pt-BR')
returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into dailycards.waitlist (email, profession, locale)
  values (trim(p_email), trim(p_profession), coalesce(p_locale, 'pt-BR'))
  on conflict do nothing;
end
$$;

-- ---------------------------------------------------------------------------
-- Regras automáticas de feedback (rodam de hora em hora).
-- Pausa: média < 2,5 com 20+ notas, ou 5+ usuários dizendo "informação incorreta".
-- Revisão (continua no ar): média < 3,0 com 10+ notas, ou 3+ "informação incorreta".
-- ---------------------------------------------------------------------------

create function dailycards_private.apply_feedback_rules() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  changed integer;
begin
  with stats as (
    select c.id, c.status,
      (select count(*) from dailycards.ratings r
        where r.card_id = c.id and r.version = c.current_version) as n,
      (select avg(r.score) from dailycards.ratings r
        where r.card_id = c.id and r.version = c.current_version) as avg_score,
      (select count(distinct rp.user_id) from dailycards.reports rp
        where rp.card_id = c.id and rp.version = c.current_version
          and rp.status = 'open' and rp.category = 'incorrect') as incorrect
    from dailycards.cards c
    where c.status in ('active', 'in_review')
  ), decided as (
    select s.id, s.status,
      case
        when (s.n >= 20 and s.avg_score < 2.5) or s.incorrect >= 5 then 'paused'
        when (s.n >= 10 and s.avg_score < 3.0) or s.incorrect >= 3 then 'in_review'
        else s.status
      end as next_status
    from stats s
  )
  update dailycards.cards c set status = d.next_status, updated_at = now()
  from decided d
  where c.id = d.id and d.next_status <> d.status
    and not (d.status = 'in_review' and d.next_status = 'active');
  get diagnostics changed = row_count;
  return changed;
end
$$;

-- ---------------------------------------------------------------------------
-- RPCs do admin (checam admins no banco; a UI só apresenta)
-- ---------------------------------------------------------------------------

create function dailycards_private.validate_card_payload(
  p_type text, p_question jsonb, p_fact_date date
) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_type = 'question' then
    if p_question is null
       or jsonb_typeof(p_question -> 'options') <> 'array'
       or jsonb_array_length(p_question -> 'options') not between 2 and 5
       or jsonb_typeof(p_question -> 'answer') <> 'number'
       or (p_question ->> 'answer')::int < 0
       or (p_question ->> 'answer')::int >= jsonb_array_length(p_question -> 'options') then
      raise exception 'invalid_question' using errcode = '22023';
    end if;
  elsif p_question is not null then
    raise exception 'question_only_for_question_cards' using errcode = '22023';
  end if;
  if p_type = 'trend' and p_fact_date is null then
    raise exception 'trend_requires_fact_date' using errcode = '22023';
  end if;
end
$$;

-- Cria card (rascunho, versão 1) ou salva conteúdo. Rascunho é editado no lugar;
-- card publicado ganha nova versão (a nota passa a contar só a partir dela).
create function dailycards.admin_save_card(
  p_card uuid,
  p_area uuid,
  p_layer text,
  p_type text,
  p_seq integer,
  p_locale text,
  p_widget_text text,
  p_body text,
  p_question jsonb,
  p_source_url text,
  p_source_label text,
  p_fact_date date,
  p_community_updated boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_admin();
  c dailycards.cards;
  ver integer;
begin
  if p_card is null then
    perform dailycards_private.validate_card_payload(p_type, p_question, p_fact_date);
    insert into dailycards.cards (area_id, layer, type, seq)
    values (p_area, p_layer, p_type, coalesce(p_seq, 0))
    returning * into c;
    ver := 1;
  else
    select * into c from dailycards.cards x where x.id = p_card for update;
    if not found then
      raise exception 'card_not_found' using errcode = 'P0002';
    end if;
    if c.status = 'removed' then
      raise exception 'card_removed' using errcode = 'P0001';
    end if;
    perform dailycards_private.validate_card_payload(coalesce(p_type, c.type), p_question, p_fact_date);
    ver := case
      when c.status = 'draft' then c.current_version
      when exists (select 1 from dailycards.ratings r where r.card_id = c.id and r.version = c.current_version)
        or exists (select 1 from dailycards.reports r where r.card_id = c.id and r.version = c.current_version)
        or exists (select 1 from dailycards.card_versions v
                   where v.card_id = c.id and v.version = c.current_version and v.locale = p_locale)
        then c.current_version + 1
      else c.current_version end;
    update dailycards.cards x set
      area_id = coalesce(p_area, x.area_id),
      layer = coalesce(p_layer, x.layer),
      type = coalesce(p_type, x.type),
      seq = coalesce(p_seq, x.seq),
      current_version = ver,
      updated_at = now()
    where x.id = c.id;
  end if;
  insert into dailycards.card_versions (
    card_id, version, locale, widget_text, body, question, source_url, source_label,
    fact_date, community_updated, created_by)
  values (
    c.id, ver, p_locale, trim(p_widget_text), trim(p_body), p_question, trim(p_source_url),
    trim(p_source_label), p_fact_date, coalesce(p_community_updated, false), uid)
  on conflict (card_id, version, locale) do update set
    widget_text = excluded.widget_text, body = excluded.body, question = excluded.question,
    source_url = excluded.source_url, source_label = excluded.source_label,
    fact_date = excluded.fact_date, community_updated = excluded.community_updated,
    created_by = excluded.created_by, created_at = now();
  return c.id;
end
$$;

create function dailycards.admin_set_status(p_card uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_admin();
  c dailycards.cards;
begin
  if p_status not in ('active', 'paused', 'removed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select * into c from dailycards.cards x where x.id = p_card for update;
  if not found then
    raise exception 'card_not_found' using errcode = 'P0002';
  end if;
  if c.status = 'removed' then
    raise exception 'card_removed' using errcode = 'P0001';
  end if;
  if p_status = 'active' and not exists (
    select 1 from dailycards.card_versions v where v.card_id = c.id and v.version = c.current_version) then
    raise exception 'card_without_content' using errcode = 'P0001';
  end if;
  update dailycards.cards x set status = p_status, updated_at = now() where x.id = c.id;
end
$$;

-- Decisão de revisão. 'fix' exige que a correção já tenha virado nova versão (admin_save_card).
create function dailycards.admin_review(p_card uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_admin();
  c dailycards.cards;
begin
  if p_decision not in ('fix', 'keep', 'remove') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  select * into c from dailycards.cards x where x.id = p_card for update;
  if not found then
    raise exception 'card_not_found' using errcode = 'P0002';
  end if;
  if p_decision = 'fix' and exists (
    select 1 from dailycards.reports r
    where r.card_id = c.id and r.status = 'open' and r.version >= c.current_version) then
    raise exception 'fix_requires_new_version' using errcode = 'P0001';
  end if;

  insert into dailycards.reviews (card_id, version, decision, note, reviewer)
  values (c.id, c.current_version, p_decision, nullif(trim(p_note), ''), uid);

  if p_decision in ('fix', 'remove') then
    insert into dailycards.email_outbox (user_id, template, payload)
    select distinct r.user_id, 'report_applied',
      jsonb_build_object('card_id', c.id, 'decision', p_decision,
        'widget_text', (select v.widget_text from dailycards.card_versions v
                        where v.card_id = c.id and v.version = r.version limit 1))
    from dailycards.reports r
    where r.card_id = c.id and r.status = 'open' and r.user_id is not null;
  end if;

  update dailycards.reports r set
    status = case when p_decision = 'keep' then 'dismissed' else 'applied' end,
    resolution_note = nullif(trim(p_note), ''),
    resolved_at = now()
  where r.card_id = c.id and r.status = 'open';

  update dailycards.cards x set
    status = case when p_decision = 'remove' then 'removed' else 'active' end,
    updated_at = now()
  where x.id = c.id;
end
$$;

create function dailycards.admin_publish_pick(
  p_area uuid, p_locale text, p_week_start date, p_card uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_admin();
begin
  if not exists (
    select 1 from dailycards.cards c
    where c.id = p_card and c.area_id = p_area and c.status = 'active') then
    raise exception 'card_not_active_in_area' using errcode = 'P0001';
  end if;
  insert into dailycards.weekly_picks (area_id, locale, week_start, card_id, approved_by)
  values (p_area, p_locale, p_week_start, p_card, uid)
  on conflict (area_id, locale, week_start) do update set
    card_id = excluded.card_id, approved_by = excluded.approved_by, published_at = now();
end
$$;

-- Aprova um candidato de trend: cria o card publicado e o coloca na semana.
create function dailycards.admin_approve_trend(
  p_item uuid,
  p_locale text,
  p_week_start date,
  p_widget_text text,
  p_body text,
  p_source_url text,
  p_source_label text,
  p_fact_date date
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  it dailycards.trend_items;
  lyr text;
  cid uuid;
begin
  perform dailycards_private.require_admin();
  select * into it from dailycards.trend_items t where t.id = p_item for update;
  if not found then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;
  lyr := case when exists (
    select 1 from dailycards.area_countries ac where ac.area_id = it.area_id and ac.layer = 'full')
    then 'technical' else 'career' end;
  cid := dailycards.admin_save_card(null, it.area_id, lyr, 'trend', 0, p_locale, p_widget_text, p_body,
    null, p_source_url, p_source_label, p_fact_date);
  perform dailycards.admin_set_status(cid, 'active');
  perform dailycards.admin_publish_pick(it.area_id, p_locale, p_week_start, cid);
  update dailycards.trend_items t set status = 'approved' where t.id = p_item;
  return cid;
end
$$;

create function dailycards.admin_set_trend_status(p_item uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform dailycards_private.require_admin();
  if p_status not in ('new', 'candidate', 'discarded') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  update dailycards.trend_items t set status = p_status where t.id = p_item;
end
$$;

-- Importa rascunhos gerados em lote (scripts/generate-cards.mts). Entram como draft.
create function dailycards.admin_import_cards(p_cards jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  a uuid;
  n integer := 0;
begin
  perform dailycards_private.require_admin();
  if jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) > 500 then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(p_cards) loop
    select x.id into a from dailycards.areas x where x.slug = item ->> 'area';
    if a is null then
      raise exception 'unknown_area: %', item ->> 'area' using errcode = '22023';
    end if;
    perform dailycards.admin_save_card(
      null, a, item ->> 'layer', item ->> 'type', coalesce((item ->> 'seq')::int, 0),
      coalesce(item ->> 'locale', 'pt-BR'), item ->> 'widget_text', item ->> 'body',
      nullif(item -> 'question', 'null'::jsonb), item ->> 'source_url', item ->> 'source_label',
      (item ->> 'fact_date')::date);
    n := n + 1;
  end loop;
  return n;
end
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table dailycards.areas enable row level security;
alter table dailycards.area_countries enable row level security;
alter table dailycards.profiles enable row level security;
alter table dailycards.user_areas enable row level security;
alter table dailycards.admins enable row level security;
alter table dailycards.subscriptions enable row level security;
alter table dailycards.revenuecat_events enable row level security;
alter table dailycards.waitlist enable row level security;
alter table dailycards.cards enable row level security;
alter table dailycards.card_versions enable row level security;
alter table dailycards.weekly_picks enable row level security;
alter table dailycards.favorites enable row level security;
alter table dailycards.ratings enable row level security;
alter table dailycards.reports enable row level security;
alter table dailycards.reviews enable row level security;
alter table dailycards.email_outbox enable row level security;
alter table dailycards.trend_sources enable row level security;
alter table dailycards.trend_items enable row level security;

create policy "catalog read" on dailycards.areas for select to anon, authenticated
  using (active or (select dailycards_private.is_admin()));
create policy "catalog countries read" on dailycards.area_countries for select to anon, authenticated
  using (true);

create policy "own profile" on dailycards.profiles for select to authenticated
  using (id = (select auth.uid()) or (select dailycards_private.is_admin()));
create policy "own areas" on dailycards.user_areas for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own subscription" on dailycards.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or (select dailycards_private.is_admin()));
create policy "own favorites" on dailycards.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own ratings" on dailycards.ratings for select to authenticated
  using (user_id = (select auth.uid()) or (select dailycards_private.is_admin()));
create policy "own reports" on dailycards.reports for select to authenticated
  using (user_id = (select auth.uid()) or (select dailycards_private.is_admin()));

create policy "admin read" on dailycards.admins for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.waitlist for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.cards for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.card_versions for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.weekly_picks for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.reviews for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.email_outbox for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.trend_sources for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.trend_items for select to authenticated using ((select dailycards_private.is_admin()));
create policy "admin read" on dailycards.revenuecat_events for select to authenticated using ((select dailycards_private.is_admin()));

-- Fontes de trend são editadas pelo admin direto (sem regra de negócio além do RLS).
create policy "admin write" on dailycards.trend_sources for all to authenticated
  using ((select dailycards_private.is_admin())) with check ((select dailycards_private.is_admin()));

-- ---------------------------------------------------------------------------
-- Grants: só as RPCs listadas ficam expostas.
-- ---------------------------------------------------------------------------

-- Banco compartilhado com outros apps: tudo vive nos schemas dailycards e dailycards_private.
-- Fora do public o Supabase não concede nada por padrão, então os grants são explícitos.
-- O schema dailycards precisa estar em Settings > Data API > Exposed schemas.
grant usage on schema dailycards to anon, authenticated, service_role;
grant all on all tables in schema dailycards to service_role;
grant all on all sequences in schema dailycards to service_role;

revoke all on all functions in schema dailycards from public, anon, authenticated;
revoke all on all functions in schema dailycards_private from public, anon, authenticated;
grant execute on all functions in schema dailycards to service_role;
grant usage on schema dailycards_private to anon, authenticated;
grant execute on function dailycards_private.is_admin() to anon, authenticated;

grant execute on function dailycards.get_sample(text, text, text) to anon, authenticated;
grant execute on function dailycards.join_waitlist(text, text, text) to anon, authenticated;

grant execute on function dailycards.save_profile(text, text, text, text) to authenticated;
grant execute on function dailycards.follow_area(uuid) to authenticated;
grant execute on function dailycards.unfollow_area(uuid) to authenticated;
grant execute on function dailycards.get_track(uuid, date, date) to authenticated;
grant execute on function dailycards.rate_card(uuid, integer) to authenticated;
grant execute on function dailycards.report_card(uuid, text, text, text) to authenticated;
grant execute on function dailycards.toggle_favorite(uuid) to authenticated;
grant execute on function dailycards.list_favorites() to authenticated;

grant execute on function dailycards.admin_save_card(
  uuid, uuid, text, text, integer, text, text, text, jsonb, text, text, date, boolean) to authenticated;
grant execute on function dailycards.admin_set_status(uuid, text) to authenticated;
grant execute on function dailycards.admin_review(uuid, text, text) to authenticated;
grant execute on function dailycards.admin_publish_pick(uuid, text, date, uuid) to authenticated;
grant execute on function dailycards.admin_approve_trend(
  uuid, text, date, text, text, text, text, date) to authenticated;
grant execute on function dailycards.admin_set_trend_status(uuid, text) to authenticated;
grant execute on function dailycards.admin_import_cards(jsonb) to authenticated;

grant select on all tables in schema dailycards to anon, authenticated;
grant insert, update, delete on dailycards.trend_sources to authenticated;
