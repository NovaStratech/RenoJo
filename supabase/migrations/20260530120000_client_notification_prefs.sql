-- Client notification preferences (configurable from the client portal).
-- Two toggles: new platform message, and quote activity.

alter table public.clients
  add column if not exists notify_on_message boolean not null default true,
  add column if not exists notify_on_quote boolean not null default true;
