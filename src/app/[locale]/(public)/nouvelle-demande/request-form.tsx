"use client";

import { useActionState, useState, useTransition } from "react";
import { submitProjectRequest, type SubmitState } from "./actions";
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
  errors: { required: string; submit: string };
};

const STEPS = ["contact", "address", "project", "description", "review"] as const;
type Step = (typeof STEPS)[number];

export default function RequestForm({ locale, labels }: { locale: "fr" | "en"; labels: Labels }) {
  const [step, setStep] = useState<Step>("contact");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoCompressing, startCompressing] = useTransition();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    addressLine: "",
    city: "",
    postalCode: "",
    projectType: "",
    urgency: "",
    budgetHint: "",
    description: "",
  });

  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitProjectRequest,
    { status: "idle" },
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
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

  function canAdvance(): boolean {
    switch (step) {
      case "contact":
        return form.fullName.trim().length >= 2 && /.+@.+\..+/.test(form.email);
      case "address":
        return true; // optional
      case "project":
        return form.projectType !== "";
      case "description":
        return form.description.trim().length >= 10;
      case "review":
        return true;
    }
  }

  const stepIdx = STEPS.indexOf(step);

  function goNext() {
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]);
  }
  function goBack() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (step !== "review") {
      e.preventDefault();
      if (canAdvance()) goNext();
      return;
    }
    // submit: build FormData with photos
    e.preventDefault();
    const fd = new FormData();
    fd.append("locale", locale);
    for (const [k, v] of Object.entries(form)) fd.append(k, v);
    for (const p of photos) fd.append("photos", p);
    formAction(fd);
  }

  const fieldError = (k: string) =>
    state.status === "error" && state.fieldErrors?.[k]?.[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress */}
      <ol className="flex gap-2 text-xs">
        {STEPS.map((s, i) => (
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
            autoComplete="email"
            required
            error={fieldError("email")}
          />
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
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {labels.projectTypes.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => update("projectType", t.value)}
                  className={`px-3 py-3 rounded-md border text-sm font-medium transition ${
                    form.projectType === t.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Urgence</label>
            <div className="flex flex-wrap gap-2">
              {labels.urgencies.map((u) => (
                <button
                  type="button"
                  key={u.value}
                  onClick={() => update("urgency", u.value)}
                  className={`px-3 py-2 rounded-md border text-sm transition ${
                    form.urgency === u.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "description" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className="text-sm font-medium block mb-1">
              {labels.fields.description}
            </label>
            <textarea
              id="description"
              required
              rows={6}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
            />
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
            value={
              labels.projectTypes.find((t) => t.value === form.projectType)?.label ?? form.projectType
            }
          />
          <Review label={labels.fields.description} value={form.description} />
          <Review label={labels.fields.photos} value={`${photos.length}`} />
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
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
          disabled={!canAdvance() || pending}
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
  type = "text",
  required = false,
  autoComplete,
  error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
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
