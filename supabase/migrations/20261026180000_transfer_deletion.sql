begin;
-- Hide deleted transfers immediately while retaining keys for any pending R2 cleanup.
alter table public.transfers add column deleted_at timestamptz;
commit;
