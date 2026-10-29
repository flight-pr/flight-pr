begin;
-- Retain recoverable sharing links encrypted at rest. Existing hashes remain valid.
alter table public.transfers add column token_ciphertext text;
commit;
