-- Programador del marcador automàtic.
--
-- ABANS D'EXECUTAR AQUEST FITXER:
-- 1. A Supabase > Edge Functions > Secrets, comprova que existeix SYNC_SECRET.
-- 2. A Supabase > Vault, crea un secret anomenat finalissima_sync_secret amb
--    exactament el mateix valor. No enganxis mai aquest valor al repositori.
--
-- La funció sync-live-score valida la capçalera x-sync-secret. El cron llegeix
-- el valor xifrat des de Vault i no el desa dins d'aquest script.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'finalissima_sync_secret'
  ) then
    raise exception
      'Falta el secret finalissima_sync_secret a Supabase Vault';
  end if;
end
$$;

-- Permet tornar a executar l'script sense crear programacions duplicades.
select cron.unschedule(jobid)
from cron.job
where jobname = 'sync-live-score-every-2-minutes';

select cron.schedule(
  'sync-live-score-every-2-minutes',
  '*/2 * * * *',
  $cron$
    select net.http_post(
      url := 'https://hnezlrjxsbujkeupogvf.supabase.co/functions/v1/sync-live-score',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'finalissima_sync_secret'
          limit 1
        )
      ),
      body := jsonb_build_object(
        'source', 'supabase-cron',
        'requested_at', now()
      ),
      timeout_milliseconds := 15000
    );
  $cron$
);

-- Comprovació: ha de mostrar una sola fila activa.
select jobid, jobname, schedule, active
from cron.job
where jobname = 'sync-live-score-every-2-minutes';

-- Per desactivar-lo en el futur:
-- select cron.unschedule(jobid)
-- from cron.job
-- where jobname = 'sync-live-score-every-2-minutes';
