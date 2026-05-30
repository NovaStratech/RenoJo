/**
 * Demo data seeder for RenoJo.
 *
 * Usage:
 *   npm run db:seed         # insert demo clients + projects (+ messages, quotes)
 *   npm run db:seed:clear   # remove all demo data
 *
 * All demo clients use the @demo.renojo.test email domain so the data is easy
 * to identify and remove. Safe to run repeatedly (idempotent: it clears existing
 * demo rows first, then re-inserts).
 *
 * Runs standalone (outside Next.js) via `tsx --env-file=.env.local`.
 */
import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { inArray, like } from "drizzle-orm";
import * as schema from "./schema";

const DEMO_DOMAIN = "@demo.renojo.test";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL is not set. Run with: tsx --env-file=.env.local src/lib/db/seed.ts");
  process.exit(1);
}

const sqlClient = postgres(DATABASE_URL, { prepare: false, max: 4 });
const db = drizzle(sqlClient, { schema });

const token64 = () => randomBytes(32).toString("hex"); // accessTokenHash
const key32 = () => randomBytes(16).toString("hex"); // inboundKey

/** Date N days ago, as a Date (for timestamps). */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
/** Date N days in the future, as YYYY-MM-DD (for the `date` column). */
const inDaysISO = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function clearDemo() {
  const demoClients = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(like(schema.clients.email, `%${DEMO_DOMAIN}`));

  const clientIds = demoClients.map((c) => c.id);
  if (clientIds.length === 0) {
    console.log("• No demo clients found — nothing to clear.");
    return;
  }

  const demoProjects = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(inArray(schema.projects.clientId, clientIds));
  const projectIds = demoProjects.map((p) => p.id);

  // Children of projects (messages, quotes→lines, photos) cascade on project delete.
  if (projectIds.length > 0) {
    await db.delete(schema.projects).where(inArray(schema.projects.id, projectIds));
  }
  await db.delete(schema.clients).where(inArray(schema.clients.id, clientIds));
  console.log(`• Cleared ${clientIds.length} demo client(s) and ${projectIds.length} project(s).`);
}

type ProjectSeed = {
  title: string;
  description: string;
  projectType: string;
  urgency: string;
  budgetHint: string;
  propertyType: string;
  occupancyStatus: string;
  preferredContact: string;
  desiredStartOffsetDays: number;
  approxArea: number;
  addressLine: string;
  city: string;
  postalCode: string;
  status: (typeof schema.projectStatus.enumValues)[number];
  createdDaysAgo: number;
  // optional conversation + quote
  withMessages?: boolean;
  quote?: {
    status: (typeof schema.quoteStatus.enumValues)[number];
    lines: { description: string; quantity: number; unit: string; unitPrice: number; taxable: boolean }[];
  };
};

type ClientSeed = {
  fullName: string;
  email: string;
  phone: string;
  locale: "fr" | "en";
  projects: ProjectSeed[];
};

const CLIENTS: ClientSeed[] = [
  {
    fullName: "Marie Tremblay",
    email: `marie.tremblay${DEMO_DOMAIN}`,
    phone: "514-555-0142",
    locale: "fr",
    projects: [
      {
        title: "Rénovation complète de cuisine",
        description:
          "Refaire la cuisine au complet : armoires, comptoir en quartz, dosseret, plomberie et électricité. La cuisine fait environ 12 pi x 14 pi. On aimerait un îlot central.",
        projectType: "kitchen",
        urgency: "weeks",
        budgetHint: "15k_30k",
        propertyType: "house",
        occupancyStatus: "owner",
        preferredContact: "email",
        desiredStartOffsetDays: 30,
        approxArea: 168,
        addressLine: "1245 rue des Érables",
        city: "Laval",
        postalCode: "H7N 2K3",
        status: "quoted",
        createdDaysAgo: 18,
        withMessages: true,
        quote: {
          status: "sent",
          lines: [
            { description: "Démolition cuisine existante", quantity: 1, unit: "forfait", unitPrice: 1800, taxable: true },
            { description: "Armoires sur mesure", quantity: 14, unit: "pi lin", unitPrice: 450, taxable: true },
            { description: "Comptoir quartz", quantity: 38, unit: "pi²", unitPrice: 95, taxable: true },
            { description: "Main-d'œuvre installation", quantity: 60, unit: "heure", unitPrice: 75, taxable: true },
          ],
        },
      },
      {
        title: "Peinture sous-sol",
        description: "Peinturer le sous-sol fini (murs et plafond), environ 600 pi². Couleur claire.",
        projectType: "painting",
        urgency: "flexible",
        budgetHint: "under_5k",
        propertyType: "house",
        occupancyStatus: "owner",
        preferredContact: "phone",
        desiredStartOffsetDays: 60,
        approxArea: 600,
        addressLine: "1245 rue des Érables",
        city: "Laval",
        postalCode: "H7N 2K3",
        status: "completed",
        createdDaysAgo: 95,
      },
    ],
  },
  {
    fullName: "James Wilson",
    email: `james.wilson${DEMO_DOMAIN}`,
    phone: "438-555-0199",
    locale: "en",
    projects: [
      {
        title: "Bathroom remodel — master ensuite",
        description:
          "Full gut and remodel of the master ensuite. Walk-in shower, double vanity, heated floors. Roughly 80 sq ft.",
        projectType: "bathroom",
        urgency: "asap",
        budgetHint: "15k_30k",
        propertyType: "condo",
        occupancyStatus: "owner",
        preferredContact: "sms",
        desiredStartOffsetDays: 14,
        approxArea: 80,
        addressLine: "455 Peel St, apt 1204",
        city: "Montréal",
        postalCode: "H3C 2G7",
        status: "in_progress",
        createdDaysAgo: 40,
        withMessages: true,
        quote: {
          status: "accepted",
          lines: [
            { description: "Demolition & disposal", quantity: 1, unit: "forfait", unitPrice: 2200, taxable: true },
            { description: "Walk-in shower system", quantity: 1, unit: "unit", unitPrice: 4800, taxable: true },
            { description: "Heated floor + tiling", quantity: 80, unit: "pi²", unitPrice: 42, taxable: true },
            { description: "Plumbing fixtures", quantity: 1, unit: "forfait", unitPrice: 3100, taxable: true },
          ],
        },
      },
      {
        title: "Hardwood flooring — living room",
        description: "Install engineered hardwood in the living and dining area, about 420 sq ft.",
        projectType: "flooring",
        urgency: "months",
        budgetHint: "5k_15k",
        propertyType: "condo",
        occupancyStatus: "owner",
        preferredContact: "email",
        desiredStartOffsetDays: 90,
        approxArea: 420,
        addressLine: "455 Peel St, apt 1204",
        city: "Montréal",
        postalCode: "H3C 2G7",
        status: "new",
        createdDaysAgo: 3,
      },
    ],
  },
  {
    fullName: "Sophie Gagnon",
    email: `sophie.gagnon${DEMO_DOMAIN}`,
    phone: "450-555-0177",
    locale: "fr",
    projects: [
      {
        title: "Aménagement sous-sol en logement",
        description:
          "Transformer le sous-sol non fini en logement avec salle de bain, cuisinette et chambre. Environ 850 pi².",
        projectType: "basement,bathroom",
        urgency: "weeks",
        budgetHint: "30k_plus",
        propertyType: "house",
        occupancyStatus: "owner",
        preferredContact: "phone",
        desiredStartOffsetDays: 45,
        approxArea: 850,
        addressLine: "78 boulevard Saint-Joseph",
        city: "Gatineau",
        postalCode: "J8Y 3X1",
        status: "in_review",
        createdDaysAgo: 8,
        withMessages: true,
      },
      {
        title: "Revêtement extérieur — façade",
        description: "Remplacer le revêtement extérieur de la façade avant par du déclin de fibrociment.",
        projectType: "exterior",
        urgency: "months",
        budgetHint: "15k_30k",
        propertyType: "house",
        occupancyStatus: "owner",
        preferredContact: "email",
        desiredStartOffsetDays: 120,
        approxArea: 0,
        addressLine: "78 boulevard Saint-Joseph",
        city: "Gatineau",
        postalCode: "J8Y 3X1",
        status: "accepted",
        createdDaysAgo: 25,
        quote: {
          status: "accepted",
          lines: [
            { description: "Retrait revêtement existant", quantity: 1, unit: "forfait", unitPrice: 1500, taxable: true },
            { description: "Déclin fibrociment installé", quantity: 90, unit: "pi²", unitPrice: 18, taxable: true },
          ],
        },
      },
    ],
  },
  {
    fullName: "David Chen",
    email: `david.chen${DEMO_DOMAIN}`,
    phone: "514-555-0123",
    locale: "en",
    projects: [
      {
        title: "Commercial office painting",
        description: "Repaint a 2,000 sq ft open office space over a weekend. Neutral colors, low-VOC paint.",
        projectType: "painting",
        urgency: "asap",
        budgetHint: "5k_15k",
        propertyType: "commercial",
        occupancyStatus: "tenant",
        preferredContact: "email",
        desiredStartOffsetDays: 10,
        approxArea: 2000,
        addressLine: "999 De La Gauchetière O",
        city: "Montréal",
        postalCode: "H3B 4G7",
        status: "lost",
        createdDaysAgo: 55,
      },
      {
        title: "Kitchen backsplash + counter",
        description: "Replace the backsplash and laminate counter with quartz. Small condo kitchen.",
        projectType: "kitchen",
        urgency: "flexible",
        budgetHint: "under_5k",
        propertyType: "condo",
        occupancyStatus: "owner",
        preferredContact: "sms",
        desiredStartOffsetDays: 75,
        approxArea: 60,
        addressLine: "210 av. du Parc, apt 5",
        city: "Montréal",
        postalCode: "H2X 1X9",
        status: "cancelled",
        createdDaysAgo: 70,
      },
    ],
  },
];

async function seed() {
  await clearDemo();

  let projectCount = 0;
  let quoteCount = 0;
  let messageCount = 0;

  for (const c of CLIENTS) {
    const [client] = await db
      .insert(schema.clients)
      .values({
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        locale: c.locale,
      })
      .returning({ id: schema.clients.id });

    for (const p of c.projects) {
      const createdAt = daysAgo(p.createdDaysAgo);
      const [project] = await db
        .insert(schema.projects)
        .values({
          clientId: client.id,
          title: p.title,
          description: p.description,
          projectType: p.projectType,
          urgency: p.urgency,
          budgetHint: p.budgetHint,
          propertyType: p.propertyType,
          occupancyStatus: p.occupancyStatus,
          preferredContact: p.preferredContact,
          desiredStartDate: inDaysISO(p.desiredStartOffsetDays),
          approxArea: p.approxArea > 0 ? p.approxArea : null,
          addressLine: p.addressLine,
          city: p.city,
          postalCode: p.postalCode,
          province: "QC",
          country: "CA",
          status: p.status,
          accessTokenHash: token64(),
          inboundKey: key32(),
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: schema.projects.id });
      projectCount++;

      if (p.withMessages) {
        await db.insert(schema.messages).values([
          {
            projectId: project.id,
            direction: "inbound",
            channel: "web",
            senderType: "client",
            fromEmail: c.email,
            subject: p.title,
            bodyText: p.description,
            createdAt,
          },
          {
            projectId: project.id,
            direction: "outbound",
            channel: "email",
            senderType: "admin",
            toEmail: c.email,
            subject: `Re: ${p.title}`,
            bodyText:
              c.locale === "fr"
                ? "Bonjour, merci pour votre demande ! Je passe sur place cette semaine pour évaluer les travaux et je vous reviens avec une estimation détaillée."
                : "Hi, thanks for your request! I'll stop by this week to assess the work and get back to you with a detailed estimate.",
            createdAt: daysAgo(p.createdDaysAgo - 1),
          },
        ]);
        messageCount += 2;
      }

      if (p.quote) {
        const lines = p.quote.lines.map((l) => ({
          ...l,
          lineTotal: Math.round(l.quantity * l.unitPrice * 100) / 100,
        }));
        const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
        const taxableBase = lines.filter((l) => l.taxable).reduce((s, l) => s + l.lineTotal, 0);
        const gst = Math.round(taxableBase * 0.05 * 100) / 100;
        const qst = Math.round(taxableBase * 0.09975 * 100) / 100;
        const total = Math.round((subtotal + gst + qst) * 100) / 100;

        const [quote] = await db
          .insert(schema.quotes)
          .values({
            projectId: project.id,
            number: `RJ-DEMO-${String(quoteCount + 1).padStart(4, "0")}`,
            status: p.quote.status,
            subtotal: subtotal.toFixed(2),
            gst: gst.toFixed(2),
            qst: qst.toFixed(2),
            total: total.toFixed(2),
            currency: "CAD",
            notes:
              c.locale === "fr"
                ? "Estimation valide 30 jours. Les prix peuvent varier selon les imprévus de chantier."
                : "Estimate valid for 30 days. Prices may vary based on site conditions.",
            sentAt: p.quote.status !== "draft" ? daysAgo(p.createdDaysAgo - 2) : null,
            acceptedAt: p.quote.status === "accepted" ? daysAgo(p.createdDaysAgo - 4) : null,
            createdAt,
            updatedAt: createdAt,
          })
          .returning({ id: schema.quotes.id });
        quoteCount++;

        await db.insert(schema.quoteLines).values(
          lines.map((l, i) => ({
            quoteId: quote.id,
            sortOrder: i,
            description: l.description,
            quantity: l.quantity.toFixed(2),
            unit: l.unit,
            unitPrice: l.unitPrice.toFixed(2),
            taxable: l.taxable,
            lineTotal: l.lineTotal.toFixed(2),
          })),
        );
      }
    }
  }

  console.log(
    `✓ Seeded ${CLIENTS.length} clients, ${projectCount} projects, ${quoteCount} quotes, ${messageCount} messages.`,
  );
}

async function main() {
  const clearOnly = process.argv.includes("--clear");
  try {
    if (clearOnly) {
      await clearDemo();
      console.log("✓ Demo data cleared.");
    } else {
      await seed();
    }
  } catch (err) {
    console.error("✗ Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

void main();
