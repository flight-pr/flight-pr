begin;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Only the database scheduler needs to issue these authenticated requests.
revoke all on all tables in schema net from public, anon, authenticated;
revoke execute on all functions in schema net from public, anon, authenticated;

-- Provision flight_transfer_cron_secret in Vault separately: never commit its value.
-- Missing credentials skip the request rather than sending an unauthenticated call.
select cron.schedule(
  'flight-transfer-cleanup',
  '7 * * * *',
  $job$
    select net.http_get(
      url := 'https://dash.flightpr.it/api/cron/transfers',
      headers := jsonb_build_object('Authorization', 'Bearer ' || decrypted_secret),
      timeout_milliseconds := 60000
    )
    from vault.decrypted_secrets
    where name = 'flight_transfer_cron_secret';
  $job$
);

commit;
