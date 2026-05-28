# RenoJo

Plateforme web pour faciliter les estimations de rénovation : les clients soumettent une demande (sans création de compte) avec photos et description ; l'administrateur reçoit les demandes, échange par email centralisé et génère des devis PDF avec acceptation en ligne. Un assistant IA aide à rédiger réponses et pré-remplir les devis.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn-style tokens
- Supabase (Postgres + Auth + Storage)
- Drizzle ORM (`postgres` driver)
- next-intl v4 (FR/EN)
- Postmark (envoi + inbound)
- OpenAI (GPT-4o-mini + GPT-4o vision)
- react-pdf

## Démarrage local

1. `cp .env.example .env.local` puis remplir les variables
2. `npm install`
3. `npm run db:push` (applique le schéma à la base Supabase — à faire après config)
4. `npm run dev`
5. Visiter `http://localhost:3000` (redirigé vers `/fr`)

## Structure

```
src/
  app/
    [locale]/
      (public)/        # routes accessibles sans compte
        nouvelle-demande/
        projet/[token]/
      (admin)/         # routes protégées par auth Supabase
        admin/
      login/
  components/
  i18n/                # routing + request config next-intl
  lib/
    auth/              # sessions + tokens magiques
    db/                # schéma + client Drizzle
    supabase/          # client browser / server / service-role
messages/              # fr.json, en.json
supabase/
  config.toml          # config Supabase (intégration GitHub)
  migrations/          # SQL généré par Drizzle, appliqué auto par Supabase
```

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — build production
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm run db:generate -- --name <nom>` — génère une migration SQL dans `supabase/migrations/`
- `npm run db:push` — applique le schéma directement (dev rapide, sans migration file)
- `npm run db:studio` — UI Drizzle Studio

## Migrations & déploiement DB

Les migrations Drizzle sont générées directement dans `supabase/migrations/` au format Supabase (`<timestamp>_<nom>.sql`). L'**intégration GitHub de Supabase** les applique automatiquement à chaque merge sur `main` — pas besoin de lancer `db:push` manuellement en production. Voir [supabase/README.md](supabase/README.md).

## État d'avancement

- ✅ Phase 1 — Fondations (Next.js, Tailwind v4, Supabase, Drizzle, next-intl, layouts, login admin)
- ⏳ Phase 2 — Flow client (formulaire de demande)
- ⏳ Phase 3 — Espace admin (dashboard, catalogue, paramètres)
- ⏳ Phase 4 — Messagerie email centralisée (Postmark inbound/outbound)
- ⏳ Phase 5 — Devis (éditeur, PDF, acceptation)
- ⏳ Phase 6 — Assistant IA
- ⏳ Phase 7 — Finitions et déploiement
