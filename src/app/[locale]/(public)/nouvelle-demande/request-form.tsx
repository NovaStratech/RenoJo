"use client";

import { useActionState, useState, useTransition } from "react";
import { submitProjectRequest, checkEmailAccount, type SubmitState } from "./actions";
import { Link } from "@/i18n/navigation";
import imageCompression from "browser-image-compression";

type Labels = {
  title: string;
  steps: {
    contact: string;
    address: string;
    project: string;
    description: string;
    review: string;
  };
  fields: Record<string, string>;
  buttons: {
    back: string;
    next: string;
    submit: string;
    submitting: string;
    addPhotos: string;
    removePhoto: string;
  };
  projectTypes: Array<{ value: string; label: string }>;
  urgencies: Array<{ value: string; label: string }>;
  budgets: Array<{ value: string; label: string }>;
  propertyTypes: Array<{ value: string; label: string }>;
  occupancyStatuses: Array<{ value: string; label: string }>;
  preferredContacts: Array<{ value: string; label: string }>;
  errors: {
    required: string;
    submit: string;
    fullName: string;
    email: string;
    passwordRequired: string;
    passwordMin: string;
    passwordMatch: string;
    projectType: string;
    description: string;
    accountExists: string;
    emailKnown: string;
    loginCta: string;
  };
  alreadyHaveAccount: string;
};

const STEPS = ["contact", "address", "project", "description", "review"] as const;
type Step = (typeof STEPS)[number];

type Prefill = {
  loggedIn: boolean;
  fullName: string;
  email: string;
  phone: string;
};

export default function RequestForm({
  locale,
  labels,
  prefill = { loggedIn: false, fullName: "", email: "", phone: "" },
}: {
  locale: "fr" | "en";
  labels: Labels;
  prefill?: Prefill;
}) {
  const loggedIn = prefill.loggedIn;
  // Signed-in clients don't re-enter contact details or create an account.
  const steps = (loggedIn
    ? ["address", "project", "description", "review"]
    : ["contact", "address", "project", "description", "review"]) as Step[];

  const [step, setStep] = useState<Step>(steps[0]);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [emailKnown, setEmailKnown] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoCompressing, startCompressing] = useTransition();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [form, setForm] = useState({
    fullName: prefill.fullName,
    email: prefill.email,
    phone: prefill.phone,
    addressLine: "",
    city: "",
    postalCode: "",
    urgency: "",
    budgetHint: "",
    propertyType: "",
    occupancyStatus: "",
    preferredContact: "",
    desiredStartDate: "",
    approxArea: "",
    description: "",
    password: "",
    passwordConfirm: "",
  });

  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitProjectRequest,
    { status: "idle" },
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "email") setEmailKnown(false);
    setStepErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  // Check whether the entered email already has an account on the platform.
  // Returns true when the email is known (and blocks moving forward).
  async function verifyEmail(): Promise<boolean> {
    const email = form.email.trim();
    if (!/.+@.+\..+/.test(email)) return false;
    try {
      const { exists } = await checkEmailAccount(email);
      setEmailKnown(exists);
      if (exists) {
        setStepErrors((e) => ({ ...e, email: labels.errors.emailKnown }));
      }
      return exists;
    } catch {
      return false;
    }
  }

  async function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking
    if (!files.length) return;
    startCompressing(async () => {
      const compressed: File[] = [];
      for (const f of files) {
        try {
          const c = await imageCompression(f, {
            maxSizeMB: 1.2,
            maxWidthOrHeight: 2000,
            useWebWorker: true,
            fileType: "image/jpeg",
          });
          compressed.push(new File([c], f.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        } catch {
          compressed.push(f);
        }
      }
      setPhotos((prev) => [...prev, ...compressed].slice(0, 12));
    });
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function validateStep(s: Step): Record<string, string> {
    const e: Record<string, string> = {};
    const E = labels.errors;
    if (s === "contact") {
      if (form.fullName.trim().length < 2) e.fullName = E.fullName;
      if (!/.+@.+\..+/.test(form.email.trim())) e.email = E.email;
    } else if (s === "project") {
      if (selectedTypes.length === 0) e.projectType = E.projectType;
    } else if (s === "description") {
      if (form.description.trim().length < 10) e.description = E.description;
    } else if (s === "review" && !loggedIn) {
      if (!form.password) e.password = E.passwordRequired;
      else if (form.password.length < 8) e.password = E.passwordMin;
      if (form.password !== form.passwordConfirm) e.passwordConfirm = E.passwordMatch;
    }
    return e;
  }

  const stepIdx = steps.indexOf(step);

  function goNext() {
    if (stepIdx < steps.length - 1) setStep(steps[stepIdx + 1]);
  }
  function goBack() {
    if (stepIdx > 0) setStep(steps[stepIdx - 1]);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step !== "review") {
      const errs = validateStep(step);
      setStepErrors(errs);
      if (Object.keys(errs).length > 0) return;
      // On the contact step, also verify the email isn't already registered.
      if (step === "contact") {
        void verifyEmail().then((known) => {
          if (!known) goNext();
        });
        return;
      }
      goNext();
      return;
    }
    // Final submit: re-validate every step that has rules.
    const allErrs = {
      ...(loggedIn ? {} : validateStep("contact")),
      ...validateStep("project"),
      ...validateStep("description"),
      ...validateStep("review"),
    };
    if (Object.keys(allErrs).length > 0) {
      setStepErrors(allErrs);
      if (!loggedIn && (allErrs.fullName || allErrs.email)) {
        setStep("contact");
      } else if (allErrs.projectType) {
        setStep("project");
      } else if (allErrs.description) {
        setStep("description");
      } else {
        setStep("review");
      }
      return;
    }
    // build FormData with photos
    const fd = new FormData();
    fd.append("locale", locale);
    if (loggedIn) fd.append("loggedIn", "1");
    fd.append("projectType", selectedTypes.join(","));
    for (const [k, v] of Object.entries(form)) fd.append(k, v);
    for (const p of photos) fd.append("photos", p);
    formAction(fd);
  }

  // Password server errors are raw codes (exists/create_failed); surface those
  // through the banner + login link instead of as a field-level message.
  const PASSWORD_FIELDS = new Set(["password", "passwordConfirm"]);
  const fieldError = (k: string): string | undefined => {
    if (stepErrors[k]) return stepErrors[k];
    if (PASSWORD_FIELDS.has(k)) return undefined;
    return (state.status === "error" && state.fieldErrors?.[k]?.[0]) || undefined;
  };
  const accountExists =
    state.status === "error" &&
    Boolean(
      state.fieldErrors?.password?.includes("exists") ||
        state.fieldErrors?.password?.includes("wrong"),
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress */}
      <ol className="flex gap-2 text-xs">
        {steps.map((s, i) => (
          <li
            key={s}
            className={`flex-1 h-1.5 rounded-full ${
              i <= stepIdx ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </ol>

      <h2 className="text-xl font-semibold">{labels.steps[step]}</h2>

      {step === "contact" && (
        <div className="space-y-4">
          <Field
            label={labels.fields.fullName}
            id="fullName"
            value={form.fullName}
            onChange={(v) => update("fullName", v)}
            autoComplete="name"
            required
            error={fieldError("fullName")}
          />
          <Field
            label={labels.fields.email}
            id="email"
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            onBlur={() => void verifyEmail()}
            autoComplete="email"
            required
            error={fieldError("email")}
          />
          {emailKnown && (
            <p className="-mt-2 text-xs text-muted-foreground">
              {labels.errors.emailKnown}{" "}
              <Link href="/login" className="underline font-medium text-foreground">
                {labels.errors.loginCta}
              </Link>
            </p>
          )}
          <Field
            label={labels.fields.phone}
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(v) => update("phone", v)}
            autoComplete="tel"
          />
        </div>
      )}

      {step === "address" && (
        <div className="space-y-4">
          <Field
            label={labels.fields.addressLine}
            id="addressLine"
            value={form.addressLine}
            onChange={(v) => update("addressLine", v)}
            autoComplete="street-address"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={labels.fields.city}
              id="city"
              value={form.city}
              onChange={(v) => update("city", v)}
              autoComplete="address-level2"
            />
            <Field
              label={labels.fields.postalCode}
              id="postalCode"
              value={form.postalCode}
              onChange={(v) => update("postalCode", v)}
              autoComplete="postal-code"
            />
          </div>
        </div>
      )}

      {step === "project" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              {labels.fields.projectType}
              <span className="text-xs text-muted-foreground font-normal ml-2">
                ({locale === "en" ? "select one or more" : "sélection multiple"})
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {labels.projectTypes.map((t) => {
                const active = selectedTypes.includes(t.value);
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => {
                      setSelectedTypes((prev) =>
                        prev.includes(t.value)
                          ? prev.filter((v) => v !== t.value)
                          : [...prev, t.value],
                      );
                      setStepErrors((e) => {
                        if (!e.projectType) return e;
                        const next = { ...e };
                        delete next.projectType;
                        return next;
                      });
                    }}
                    aria-pressed={active}
                    className={`px-3 py-3 rounded-md border text-sm font-medium transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {fieldError("projectType") && (
              <p className="text-xs text-destructive mt-2">{fieldError("projectType")}</p>
            )}
          </div>
          <ChipGroup
            label={labels.fields.urgency}
            options={labels.urgencies}
            value={form.urgency}
            onChange={(v) => update("urgency", v)}
          />

          <ChipGroup
            label={labels.fields.propertyType}
            options={labels.propertyTypes}
            value={form.propertyType}
            onChange={(v) => update("propertyType", v)}
            optionalLabel={labels.fields.optional}
          />

          <ChipGroup
            label={labels.fields.occupancyStatus}
            options={labels.occupancyStatuses}
            value={form.occupancyStatus}
            onChange={(v) => update("occupancyStatus", v)}
            optionalLabel={labels.fields.optional}
          />

          <ChipGroup
            label={labels.fields.budget}
            options={labels.budgets}
            value={form.budgetHint}
            onChange={(v) => update("budgetHint", v)}
            optionalLabel={labels.fields.optional}
          />

          <ChipGroup
            label={labels.fields.preferredContact}
            options={labels.preferredContacts}
            value={form.preferredContact}
            onChange={(v) => update("preferredContact", v)}
            optionalLabel={labels.fields.optional}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="desiredStartDate" className="text-sm font-medium block mb-1">
                {labels.fields.desiredStartDate}
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({labels.fields.optional})
                </span>
              </label>
              <input
                id="desiredStartDate"
                type="date"
                value={form.desiredStartDate}
                onChange={(e) => update("desiredStartDate", e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <div>
              <label htmlFor="approxArea" className="text-sm font-medium block mb-1">
                {labels.fields.approxArea}
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({labels.fields.optional})
                </span>
              </label>
              <input
                id="approxArea"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={labels.fields.approxAreaHint}
                value={form.approxArea}
                onChange={(e) => update("approxArea", e.target.value.replace(/[^\d]/g, ""))}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
          </div>
        </div>
      )}

      {step === "description" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className="text-sm font-medium block mb-1">
              {labels.fields.description}
              <span className="text-xs text-muted-foreground font-normal ml-2">
                ({labels.fields.descriptionHint})
              </span>
            </label>
            <textarea
              id="description"
              required
              rows={6}
              minLength={10}
              placeholder={labels.fields.descriptionHint}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {form.description.trim().length} / 10
            </p>
            {fieldError("description") && (
              <p className="text-xs text-destructive mt-1">{fieldError("description")}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">{labels.fields.photos}</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onFilesPicked}
              className="block text-sm"
            />
            {photoCompressing && <p className="text-xs text-muted-foreground mt-1">…</p>}
            {photos.length > 0 && (
              <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                {photos.map((p, i) => (
                  <li key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(p)}
                      alt=""
                      className="w-full h-24 object-cover rounded-md border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black/70 text-white text-xs rounded-full w-6 h-6 leading-6 text-center"
                      aria-label={labels.buttons.removePhoto}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-3 text-sm">
          <Review label={labels.fields.fullName} value={form.fullName} />
          <Review label={labels.fields.email} value={form.email} />
          {form.phone && <Review label={labels.fields.phone} value={form.phone} />}
          {(form.addressLine || form.city || form.postalCode) && (
            <Review
              label={labels.fields.addressLine}
              value={[form.addressLine, form.city, form.postalCode].filter(Boolean).join(", ")}
            />
          )}
          <Review
            label={labels.fields.projectType}
            value={selectedTypes
              .map((v) => labels.projectTypes.find((t) => t.value === v)?.label ?? v)
              .join(", ")}
          />
          <Review label={labels.fields.description} value={form.description} />
          <Review label={labels.fields.photos} value={`${photos.length}`} />

          {!loggedIn && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4 !mt-6">
              <div>
                <p className="text-sm font-medium">{labels.fields.accountTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {labels.fields.accountHint}
                </p>
              </div>
              <Field
                label={labels.fields.password}
                id="password"
                type="password"
                value={form.password}
                onChange={(v) => update("password", v)}
                autoComplete="new-password"
                required
                error={stepErrors.password}
              />
              <Field
                label={labels.fields.passwordConfirm}
                id="passwordConfirm"
                type="password"
                value={form.passwordConfirm}
                onChange={(v) => update("passwordConfirm", v)}
                autoComplete="new-password"
                required
                error={stepErrors.passwordConfirm}
              />
            </div>
          )}
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-destructive space-y-1">
          <p>{state.message}</p>
          {accountExists && (
            <Link href="/login" className="underline font-medium inline-block">
              {labels.errors.loginCta}
            </Link>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIdx === 0 || pending}
          className="px-4 py-2 rounded-md border border-border text-sm disabled:opacity-50"
        >
          {labels.buttons.back}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {step === "review"
            ? pending
              ? labels.buttons.submitting
              : labels.buttons.submit
            : labels.buttons.next}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  onBlur,
  type = "text",
  required = false,
  autoComplete,
  error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string | false;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium block mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full px-3 py-2 rounded-md border border-input bg-background"
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-border pb-2">
      <div className="w-32 shrink-0 text-muted-foreground">{label}</div>
      <div className="flex-1 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
  optionalLabel,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  optionalLabel?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-2">
        {label}
        {optionalLabel && (
          <span className="text-xs text-muted-foreground font-normal ml-1">({optionalLabel})</span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => onChange(active ? "" : o.value)}
              aria-pressed={active}
              className={`px-3 py-2 rounded-md border text-sm transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
