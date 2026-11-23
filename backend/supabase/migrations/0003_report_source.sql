-- Fonte da sugestão de correção: só texto de referência ou link https limpo.
-- O link nunca é aberto pelo servidor; só o revisor vê, e o admin mostra o domínio antes de qualquer clique.
-- Regras: sem caracteres de controle; se tiver esquema (algo://), tem que ser https, sem usuário/senha
-- antes do domínio (https://banco.com@golpe.com) e sem espaço.

create function dailycards_private.is_safe_source(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p is null or (
    char_length(p) <= 500
    and p !~ '[[:cntrl:]]'
    and (
      p !~* '^[a-z][a-z0-9+.-]*:'
      or p ~* '^https://[^/?#@[:space:]]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
    )
  )
$$;

alter table dailycards.reports drop constraint reports_source_check;
alter table dailycards.reports
  add constraint reports_source_check check (dailycards_private.is_safe_source(source)) not valid;

create or replace function dailycards.report_card(
  p_card uuid, p_category text, p_text text, p_source text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := dailycards_private.require_user();
  c dailycards.cards;
  rid uuid;
  src text := nullif(trim(p_source), '');
begin
  if p_category not in ('incorrect', 'outdated', 'incomplete', 'confusing', 'context') then
    raise exception 'invalid_category' using errcode = '22023';
  end if;
  if not dailycards_private.is_safe_source(src) then
    raise exception 'invalid_source' using errcode = '22023';
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
          src, c.type = 'trend' or p_category = 'incorrect')
  returning id into rid;
  return rid;
end
$$;
