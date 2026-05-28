# Supabase

Ce dossier est lu par l'**intégration GitHub Supabase** : à chaque merge sur `main`, les fichiers SQL présents dans `supabase/migrations/` sont appliqués à la base de production.

## Workflow

1. Modifier le schéma dans [src/lib/db/schema.ts](../src/lib/db/schema.ts)
2. Générer la migration SQL :
   ```bash
   npm run db:generate -- --name <nom_descriptif>
   ```
   → crée `supabase/migrations/<timestamp>_<nom>.sql`
3. Inspecter le SQL généré, ajuster si besoin
4. Commit + push sur `main`
5. Supabase applique automatiquement la migration

## Ne pas modifier à la main

Le dossier `meta/` est géré par drizzle-kit (snapshots pour le diff). Ne pas éditer.

Les fichiers `migrations/*.sql` peuvent être édités manuellement si nécessaire **avant** qu'ils soient appliqués (par exemple pour ajouter des policies RLS), mais une fois en production il faut créer une nouvelle migration plutôt que modifier l'ancienne.
