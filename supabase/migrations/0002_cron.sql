-- Agenda as regras de feedback de hora em hora via pg_cron (disponível no Supabase).
-- Fora do Supabase (ex.: testes), a migração não faz nada.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('feedback-rules', '7 * * * *', 'select private.apply_feedback_rules()');
  end if;
end
$$;
