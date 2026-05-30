-- Additional project qualification fields collected on the client request form.
-- Additive, non-destructive: all columns are nullable.

alter table public.projects
  add column if not exists property_type      varchar(30),
  add column if not exists occupancy_status   varchar(20),
  add column if not exists preferred_contact  varchar(20),
  add column if not exists desired_start_date date,
  add column if not exists approx_area        integer;
