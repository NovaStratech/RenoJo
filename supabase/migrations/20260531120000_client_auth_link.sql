-- Add auth link for client portal accounts
alter table public.clients
  add column if not exists auth_user_id uuid;

create unique index if not exists clients_auth_user_id_idx
  on public.clients (auth_user_id)
  where auth_user_id is not null;
