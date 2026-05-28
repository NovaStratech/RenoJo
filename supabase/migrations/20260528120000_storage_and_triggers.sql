-- Storage buckets used by the app + automatic updated_at triggers.

-- =========================================================================
-- Storage buckets (private — accessed via signed URLs / service role)
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-photos', 'project-photos', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('quote-pdfs', 'quote-pdfs', false, 10485760, array['application/pdf']),
  ('message-attachments', 'message-attachments', false, 26214400, null),
  ('company-assets', 'company-assets', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- =========================================================================
-- updated_at auto-touch trigger
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'clients',
      'projects',
      'catalog_items',
      'quotes',
      'invoices',
      'company_settings'
    ])
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I;', t
    );
    execute format(
      'create trigger trg_set_updated_at before update on public.%I
        for each row execute function public.set_updated_at();', t
    );
  end loop;
end;
$$;

-- =========================================================================
-- Seed: singleton company_settings row + default catalog items (idempotent)
-- =========================================================================

insert into public.company_settings (id, business_name)
values (1, 'RenoJo')
on conflict (id) do nothing;

insert into public.catalog_items (name, description, category, default_quantity, unit, unit_price, taxable, active)
values
  ('Déplacement', 'Frais de déplacement aller-retour', 'fees', 1, 'forfait', 50.00, true, true),
  ('Main d''œuvre', 'Heure de main-d''œuvre standard', 'labor', 1, 'hour', 75.00, true, true),
  ('Estimation détaillée', 'Préparation et présentation du devis', 'fees', 1, 'forfait', 0.00, false, true)
on conflict do nothing;
