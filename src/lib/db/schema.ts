import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* =========================================================================
 * Enums
 * ========================================================================= */

export const projectStatus = pgEnum("project_status", [
  "new",
  "in_review",
  "quoted",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "lost",
]);

export const messageDirection = pgEnum("message_direction", ["inbound", "outbound"]);
export const messageChannel = pgEnum("message_channel", ["email", "web", "system"]);
export const senderType = pgEnum("sender_type", ["client", "admin", "system"]);

export const quoteStatus = pgEnum("quote_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
]);

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
]);

export const aiDraftKind = pgEnum("ai_draft_kind", [
  "reply",
  "quote_prefill",
  "project_summary",
  "catalog_suggestion",
]);

export const localeEnum = pgEnum("locale", ["fr", "en"]);

/* =========================================================================
 * Admin users — link to Supabase auth.users
 * ========================================================================= */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: uuid("auth_user_id").notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  fullName: varchar("full_name", { length: 200 }),
  locale: localeEnum("locale").notNull().default("fr"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* =========================================================================
 * Clients
 * ========================================================================= */

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    locale: localeEnum("locale").notNull().default("fr"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("clients_email_idx").on(t.email),
  }),
);

/* =========================================================================
 * Projects — one per estimation request
 * ========================================================================= */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),

    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    projectType: varchar("project_type", { length: 60 }), // e.g. kitchen, bathroom, painting, flooring, other
    urgency: varchar("urgency", { length: 30 }), // asap | weeks | months | flexible
    budgetHint: varchar("budget_hint", { length: 50 }),

    // Address snapshot at submission time (client may change later)
    addressLine: varchar("address_line", { length: 200 }),
    city: varchar("city", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    province: varchar("province", { length: 60 }).default("QC"),
    country: varchar("country", { length: 2 }).default("CA"),

    status: projectStatus("status").notNull().default("new"),

    // Magic link token for client access — hashed (sha256 hex)
    accessTokenHash: varchar("access_token_hash", { length: 64 }).notNull().unique(),

    // Unique inbound email key (used in reply+<key>@reply.domain)
    inboundKey: varchar("inbound_key", { length: 32 }).notNull().unique(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clientIdx: index("projects_client_idx").on(t.clientId),
    statusIdx: index("projects_status_idx").on(t.status),
    createdAtIdx: index("projects_created_at_idx").on(t.createdAt),
  }),
);

/* =========================================================================
 * Project photos
 * ========================================================================= */

export const projectPhotos = pgTable(
  "project_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(), // path in Supabase Storage bucket
    caption: text("caption"),
    uploadedBy: senderType("uploaded_by").notNull().default("client"),
    sortOrder: integer("sort_order").notNull().default(0),
    aiAnalysis: jsonb("ai_analysis"), // cached vision-model analysis
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("project_photos_project_idx").on(t.projectId),
  }),
);

/* =========================================================================
 * Messages — unified inbox per project
 * ========================================================================= */

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    direction: messageDirection("direction").notNull(),
    channel: messageChannel("channel").notNull().default("email"),
    senderType: senderType("sender_type").notNull(),

    fromEmail: varchar("from_email", { length: 320 }),
    toEmail: varchar("to_email", { length: 320 }),
    subject: text("subject"),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),

    // Email threading
    postmarkMessageId: varchar("postmark_message_id", { length: 120 }),
    inReplyTo: varchar("in_reply_to", { length: 998 }),
    referencesHeader: text("references_header"),

    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("messages_project_idx").on(t.projectId),
    createdAtIdx: index("messages_created_at_idx").on(t.createdAt),
  }),
);

export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* =========================================================================
 * Catalog items — reusable quote line presets
 * ========================================================================= */

export const catalogItems = pgTable("catalog_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 60 }),
  defaultQuantity: numeric("default_quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unit: varchar("unit", { length: 30 }).notNull().default("unit"), // unit | hour | km | m2 | forfait
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  taxable: boolean("taxable").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* =========================================================================
 * Quotes & lines
 * ========================================================================= */

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    number: varchar("number", { length: 30 }).notNull().unique(), // e.g. RJ-2026-0001
    status: quoteStatus("status").notNull().default("draft"),

    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    gst: numeric("gst", { precision: 12, scale: 2 }).notNull().default("0"), // TPS 5%
    qst: numeric("qst", { precision: 12, scale: 2 }).notNull().default("0"), // TVQ 9.975%
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull().default("CAD"),

    notes: text("notes"),
    terms: text("terms"),

    validUntil: timestamp("valid_until", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),

    // Acceptance trace
    signatureDataUrl: text("signature_data_url"), // base64 png of signature
    signatureIp: varchar("signature_ip", { length: 64 }),
    signatureName: varchar("signature_name", { length: 200 }),

    pdfStoragePath: text("pdf_storage_path"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("quotes_project_idx").on(t.projectId),
    statusIdx: index("quotes_status_idx").on(t.status),
  }),
);

export const quoteLines = pgTable(
  "quote_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
    unit: varchar("unit", { length: 30 }).notNull().default("unit"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
    taxable: boolean("taxable").notNull().default(true),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
  },
  (t) => ({
    quoteIdx: index("quote_lines_quote_idx").on(t.quoteId),
  }),
);

/* =========================================================================
 * Invoices (created from accepted quotes)
 * ========================================================================= */

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),

  number: varchar("number", { length: 30 }).notNull().unique(), // e.g. RJF-2026-0001
  status: invoiceStatus("status").notNull().default("draft"),

  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  gst: numeric("gst", { precision: 12, scale: 2 }).notNull().default("0"),
  qst: numeric("qst", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).notNull().default("CAD"),

  dueDate: timestamp("due_date", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),

  pdfStoragePath: text("pdf_storage_path"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* =========================================================================
 * AI drafts cache
 * ========================================================================= */

export const aiDrafts = pgTable("ai_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
  kind: aiDraftKind("kind").notNull(),
  content: jsonb("content").notNull(),
  model: varchar("model", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* =========================================================================
 * Audit log
 * ========================================================================= */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: senderType("actor_type").notNull(),
    actorId: uuid("actor_id"), // admin_users.id or clients.id (nullable for system)
    action: varchar("action", { length: 80 }).notNull(),
    entity: varchar("entity", { length: 40 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    entityIdx: index("audit_log_entity_idx").on(t.entity, t.entityId),
    createdAtIdx: index("audit_log_created_at_idx").on(t.createdAt),
  }),
);

/* =========================================================================
 * Settings (single-row company profile)
 * ========================================================================= */

export const companySettings = pgTable("company_settings", {
  id: integer("id").primaryKey().default(1), // singleton row
  businessName: varchar("business_name", { length: 200 }).notNull().default("RenoJo"),
  legalName: varchar("legal_name", { length: 200 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  addressLine: varchar("address_line", { length: 200 }),
  city: varchar("city", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  province: varchar("province", { length: 60 }).default("QC"),
  country: varchar("country", { length: 2 }).default("CA"),
  gstNumber: varchar("gst_number", { length: 30 }), // n° TPS
  qstNumber: varchar("qst_number", { length: 30 }), // n° TVQ
  gstRate: numeric("gst_rate", { precision: 6, scale: 4 }).notNull().default("0.0500"),
  qstRate: numeric("qst_rate", { precision: 6, scale: 4 }).notNull().default("0.09975"),
  logoStoragePath: text("logo_storage_path"),
  defaultTerms: text("default_terms"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* =========================================================================
 * Relations
 * ========================================================================= */

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  photos: many(projectPhotos),
  messages: many(messages),
  quotes: many(quotes),
  invoices: many(invoices),
  aiDrafts: many(aiDrafts),
}));

export const projectPhotosRelations = relations(projectPhotos, ({ one }) => ({
  project: one(projects, { fields: [projectPhotos.projectId], references: [projects.id] }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  project: one(projects, { fields: [messages.projectId], references: [projects.id] }),
  attachments: many(messageAttachments),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, { fields: [messageAttachments.messageId], references: [messages.id] }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  project: one(projects, { fields: [quotes.projectId], references: [projects.id] }),
  lines: many(quoteLines),
}));

export const quoteLinesRelations = relations(quoteLines, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLines.quoteId], references: [quotes.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  quote: one(quotes, { fields: [invoices.quoteId], references: [quotes.id] }),
}));

// Silence unused import warnings in dev (sql may be used by future raw expressions)
export const __sql_marker = sql;
