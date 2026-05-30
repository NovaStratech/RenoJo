"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, projects, projectPhotos } from "@/lib/db/schema";
import { generateAccessToken, generateInboundKey } from "@/lib/auth/tokens";
import { uploadToBucket, BUCKETS, randomFilename } from "@/lib/storage";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getClientForUser } from "@/lib/auth/session";

const requestSchema = z.object({
  locale: z.enum(["fr", "en"]).default("fr"),
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().toLowerCase().email().max(320),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  addressLine: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  projectType: z.string().trim().min(1).max(300),
  urgency: z.string().trim().max(30).optional().or(z.literal("")),
  budgetHint: z.string().trim().max(50).optional().or(z.literal("")),
  propertyType: z.string().trim().max(30).optional().or(z.literal("")),
  occupancyStatus: z.string().trim().max(20).optional().or(z.literal("")),
  preferredContact: z.string().trim().max(20).optional().or(z.literal("")),
  desiredStartDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  approxArea: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/)
    .optional()
    .or(z.literal("")),
  description: z.string().trim().min(10).max(5000),
  password: z.string().max(72).optional().or(z.literal("")),
  passwordConfirm: z.string().max(72).optional().or(z.literal("")),
});

const MAX_PHOTOS = 12;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success"; token: string; locale: "fr" | "en" };

/**
 * Server action invoked by the public request form.
 * Creates (or reuses) a client, creates a project, uploads photos, sends emails.
 * Then redirects to the client portal.
 */
export async function submitProjectRequest(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const raw: Record<string, string> = {};
  for (const key of [
    "locale",
    "fullName",
    "email",
    "phone",
    "addressLine",
    "city",
    "postalCode",
    "projectType",
    "urgency",
    "budgetHint",
    "propertyType",
    "occupancyStatus",
    "preferredContact",
    "desiredStartDate",
    "approxArea",
    "description",
    "password",
    "passwordConfirm",
  ]) {
    const v = formData.get(key);
    if (typeof v === "string") raw[key] = v;
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".");
      (fieldErrors[k] ??= []).push(issue.message);
    }
    return {
      status: "error",
      message: "Veuillez corriger les champs en surbrillance.",
      fieldErrors,
    };
  }
  const data = parsed.data;
  const fr = data.locale === "fr";
  const loggedIn = formData.get("loggedIn") === "1";

  // Account credentials are only required when the visitor isn't already
  // signed in. Signed-in clients reuse their session and skip this entirely.
  if (!loggedIn) {
    if (!data.password || data.password.length < 8) {
      return {
        status: "error",
        message: fr
          ? "Le mot de passe doit contenir au moins 8 caractères."
          : "Password must be at least 8 characters.",
        fieldErrors: { password: ["min"] },
      };
    }
    if (data.password !== data.passwordConfirm) {
      return {
        status: "error",
        message: fr
          ? "Les mots de passe ne correspondent pas."
          : "Passwords do not match.",
        fieldErrors: { passwordConfirm: ["mismatch"] },
      };
    }
  }

  const photoEntries = formData.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);
  if (photoEntries.length > MAX_PHOTOS) {
    return { status: "error", message: `Maximum ${MAX_PHOTOS} photos.` };
  }
  for (const file of photoEntries) {
    if (file.size > MAX_PHOTO_BYTES) {
      return { status: "error", message: `Photo trop volumineuse (max ${MAX_PHOTO_BYTES / 1024 / 1024} Mo).` };
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return { status: "error", message: `Type de fichier non supporté : ${file.type}` };
    }
  }

  // Generate magic token + inbound key (used by the project either way).
  const { hash } = generateAccessToken();
  const inboundKey = generateInboundKey();

  // Resolve the owning client.
  let clientId: string;

  if (loggedIn) {
    // Reuse the authenticated client — no account creation, no contact re-entry.
    const sessionUser = await getCurrentUser();
    const sessionClient = sessionUser
      ? await getClientForUser(sessionUser.id)
      : null;
    if (!sessionClient) {
      redirect(`/${data.locale}/login`);
    }
    clientId = sessionClient.id;
    // Project title uses the client's saved details.
    if (data.phone && (data.phone || "") !== (sessionClient.phone ?? "")) {
      await db
        .update(clients)
        .set({ phone: data.phone, updatedAt: new Date() })
        .where(eq(clients.id, clientId));
    }
  } else {
    // Look up any existing client by email (email is the natural key).
    const existingClient = await db
      .select()
      .from(clients)
      .where(eq(clients.email, data.email))
      .limit(1);

    // Resolve the client portal account: sign in to an existing one, or create
    // a new one — then establish a session so the visitor lands logged in.
    const supabase = await createSupabaseServerClient();
    let authUserId: string | null = existingClient[0]?.authUserId ?? null;

    const wrongPasswordError = (): SubmitState => ({
      status: "error",
      message: fr
        ? "Un compte existe déjà pour ce courriel. Mot de passe incorrect — réessayez ou connectez-vous."
        : "An account already exists for this email. Wrong password — try again or sign in.",
      fieldErrors: { password: ["wrong"] },
    });

    if (authUserId) {
      // Existing linked account → authenticate with the provided password.
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password!,
      });
      if (signErr) return wrongPasswordError();
    } else {
      // No linked account → try to create one.
      const service = createSupabaseServiceClient();
      const { data: created, error: createErr } =
        await service.auth.admin.createUser({
          email: data.email,
          password: data.password!,
          email_confirm: true,
        });
      if (createErr || !created?.user) {
        const alreadyExists = createErr?.message
          ?.toLowerCase()
          .includes("already");
        if (!alreadyExists) {
          return {
            status: "error",
            message: fr
              ? "Impossible de créer le compte. Réessayez."
              : "Could not create the account. Please try again.",
            fieldErrors: { password: ["create_failed"] },
          };
        }
        // An auth user exists but isn't linked yet → adopt it by signing in.
        const { data: signInData, error: signErr } =
          await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password!,
          });
        if (signErr || !signInData.user) return wrongPasswordError();
        authUserId = signInData.user.id;
      } else {
        authUserId = created.user.id;
        // Sign the freshly created user in to establish the session cookie.
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password!,
        });
      }
    }

    // Upsert client by email and ensure the auth link is set.
    if (existingClient[0]) {
      clientId = existingClient[0].id;
      await db
        .update(clients)
        .set({
          fullName: data.fullName,
          phone: data.phone || existingClient[0].phone,
          locale: data.locale,
          authUserId,
        })
        .where(eq(clients.id, clientId));
    } else {
      const inserted = await db
        .insert(clients)
        .values({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || null,
          locale: data.locale,
          authUserId,
        })
        .returning({ id: clients.id });
      clientId = inserted[0].id;
    }
  }

  // Project title heuristic
  const projectTitle = buildProjectTitle(data.projectType, data.city);

  // Create project
  const projectInsert = await db
    .insert(projects)
    .values({
      clientId,
      title: projectTitle,
      description: data.description,
      projectType: data.projectType,
      urgency: data.urgency || null,
      budgetHint: data.budgetHint || null,
      propertyType: data.propertyType || null,
      occupancyStatus: data.occupancyStatus || null,
      preferredContact: data.preferredContact || null,
      desiredStartDate: data.desiredStartDate || null,
      approxArea: data.approxArea ? Number(data.approxArea) : null,
      addressLine: data.addressLine || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      accessTokenHash: hash,
      inboundKey,
      status: "new",
    })
    .returning({ id: projects.id });
  const projectId = projectInsert[0].id;

  // Upload photos (best-effort — failure on one shouldn't kill the request)
  let photoOrder = 0;
  for (const file of photoEntries) {
    try {
      const path = `${projectId}/${randomFilename(file.name || "photo.jpg")}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadToBucket(BUCKETS.projectPhotos, path, buffer, file.type);
      await db.insert(projectPhotos).values({
        projectId,
        storagePath: path,
        uploadedBy: "client",
        sortOrder: photoOrder++,
      });
    } catch (err) {
      console.error("[submitProjectRequest] photo upload failed", err);
    }
  }

  // Communications happen inside the platform — the client is now signed in and
  // lands on their portal where the new project (and messaging) is available.
  redirect(`/${data.locale}/espace-client`);
}

function buildProjectTitle(projectType: string, city?: string): string {
  const labels: Record<string, string> = {
    kitchen: "Cuisine",
    bathroom: "Salle de bain",
    painting: "Peinture",
    flooring: "Plancher",
    basement: "Sous-sol",
    exterior: "Extérieur",
    other: "Projet de rénovation",
  };
  const types = projectType
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const base =
    types.length === 0
      ? "Projet de rénovation"
      : types.map((t) => labels[t] ?? t).join(" + ");
  return city ? `${base} — ${city}` : base;
}

/**
 * Lightweight check used by the contact step: tells the form whether the
 * provided email already has a client account on the platform, so the visitor
 * can be invited to sign in instead of starting a new request.
 */
export async function checkEmailAccount(
  email: string,
): Promise<{ exists: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(normalized)) return { exists: false };
  const rows = await db
    .select({ authUserId: clients.authUserId })
    .from(clients)
    .where(eq(clients.email, normalized))
    .limit(1);
  return { exists: Boolean(rows[0]?.authUserId) };
}

