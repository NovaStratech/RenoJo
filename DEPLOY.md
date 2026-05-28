# Deploy notes — RenoJo

## 1. Database (Supabase)

1. Create a Supabase project. Region: closest to Québec (e.g. `us-east-1`).
2. From SQL editor or via Supabase CLI, run migrations in order:
   - `supabase/migrations/20260528115331_initial_schema.sql`
   - `supabase/migrations/20260528120000_storage_and_triggers.sql`
3. Confirm buckets exist (Storage tab):
   - `project-photos` (private)
   - `quote-pdfs` (private)
   - `message-attachments` (private)
   - `company-assets` (public — logos)
4. Copy these values from Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role secret — server only!)
   - `DATABASE_URL` — **use the Transaction pooler** (port `6543`) with
     `?pgbouncer=true` for serverless. Drizzle is configured for `prepare: false`.

## 2. Vercel (or any Next 16 host)

Environment variables (all required unless marked optional):

| Variable | Notes |
|---|---|
| `APP_URL` | e.g. `https://renojo.example.com` (no trailing slash) |
| `TOKEN_SECRET` | random ≥32 chars (`openssl rand -base64 48`) |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase (server only) |
| `DATABASE_URL` | Supabase pooler URL on port 6543 |
| `POSTMARK_SERVER_TOKEN` | optional — emails are no-op when missing |
| `POSTMARK_FROM_EMAIL` | e.g. `joe@yourdomain.com` |
| `POSTMARK_REPLY_DOMAIN` | e.g. `reply.yourdomain.com` (DKIM-signed) |
| `POSTMARK_INBOUND_WEBHOOK_TOKEN` | random ≥16 chars; used as `?token=` on the webhook |
| `OPENAI_API_KEY` | optional — AI features no-op when missing |
| `OPENAI_MODEL_TEXT` | optional, default `gpt-4o-mini` |
| `OPENAI_MODEL_VISION` | optional, default `gpt-4o` |

Build command: `npm run build`. Start command: `npm start` (or use Vercel's defaults).

## 3. Postmark (email)

### Outbound (transactional)

1. Add and verify your sending domain in Postmark.
2. DNS records to add at your registrar:
   - **SPF**: `v=spf1 a mx include:spf.mtasv.net ~all`
   - **DKIM**: TXT record from Postmark dashboard
   - **Return-Path** (custom): CNAME (optional but recommended)
   - **DMARC** (recommended): `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`
3. Create a Server in Postmark, copy the **Server Token** into `POSTMARK_SERVER_TOKEN`.
4. Set `POSTMARK_FROM_EMAIL` to a verified sender on that domain.

### Inbound (centralized replies)

1. Pick a subdomain to receive replies: e.g. `reply.yourdomain.com`. This goes into `POSTMARK_REPLY_DOMAIN`.
2. Add the MX records Postmark gives you:
   - `reply.yourdomain.com.  MX  10 inbound.postmarkapp.com.`
3. In Postmark **Servers → Inbound**, set the **Inbound webhook URL** to:
   ```
   https://renojo.example.com/api/postmark/inbound?token=<POSTMARK_INBOUND_WEBHOOK_TOKEN>
   ```
4. Enable "Include raw email content" is **not** required — we use the parsed fields.
5. Set the inbound address to `reply@<POSTMARK_REPLY_DOMAIN>`. Each project's `inboundKey` is appended as `reply+<key>@<domain>` so all replies land on the same address but route to the right project.

Test: send a message from the app, reply from your mailbox — the reply must appear in the project's timeline and `inbound_email_log` should NOT contain an unmatched row.

## 4. Admin user

There is no signup. To create an admin:

1. In Supabase **Auth → Users**, invite or create a user with the email you'll log in as.
2. In `admin_users` table, insert a matching row:
   ```sql
   insert into admin_users (auth_user_id, email, full_name, role, active)
   values ('<auth.uid>', 'joe@yourdomain.com', 'Joe', 'admin', true);
   ```
3. Update `company_settings` (id = 1) with the real business name, GST/QST numbers, address, etc.

## 5. Smoke test

1. Open `/fr/nouvelle-demande` → submit a request with 1-2 photos.
2. Log in as admin → confirm the project appears on the dashboard.
3. Open the project → click **Suggérer une réponse** (if OpenAI is configured) → send a reply.
4. Reply from your mailbox → confirm it shows up in the timeline.
5. Create a new quote → **Pré-remplir depuis photos** → send → open the client link in incognito → sign + accept.
6. Convert to invoice → verify `RJF-YYYY-0001` is created.

## 6. Backups

Supabase performs automated daily backups on paid plans. For Storage buckets, consider periodic snapshots to an S3 bucket if PDFs/photos retention matters legally.

## 7. RGPD / loi 25 (Québec)

- Inform clients on the request form that photos and the description are stored to process their request.
- Provide a delete-on-request flow (manual for v1: delete from `projects` cascades to `quotes`, `messages`, `project_photos`).
