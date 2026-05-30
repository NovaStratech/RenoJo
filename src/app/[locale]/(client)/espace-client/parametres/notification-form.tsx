"use client";

import { useActionState, useState } from "react";
import {
  updateNotificationPrefs,
  type NotificationPrefsState,
} from "./actions";

const initial: NotificationPrefsState = { ok: false };

export default function NotificationForm({
  locale,
  defaults,
  labels,
}: {
  locale: string;
  defaults: { notifyOnMessage: boolean; notifyOnQuote: boolean };
  labels: {
    message: string;
    messageHint: string;
    quote: string;
    quoteHint: string;
    save: string;
    saving: string;
    saved: string;
  };
}) {
  const action = updateNotificationPrefs.bind(null, locale);
  const [state, formAction, pending] = useActionState(action, initial);
  const [onMessage, setOnMessage] = useState(defaults.notifyOnMessage);
  const [onQuote, setOnQuote] = useState(defaults.notifyOnQuote);

  return (
    <form action={formAction} className="space-y-5">
      <Toggle
        name="notifyOnMessage"
        checked={onMessage}
        onChange={setOnMessage}
        label={labels.message}
        hint={labels.messageHint}
      />
      <Toggle
        name="notifyOnQuote"
        checked={onQuote}
        onChange={setOnQuote}
        label={labels.quote}
        hint={labels.quoteHint}
      />
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          {pending ? labels.saving : labels.save}
        </button>
        {state.ok && (
          <span className="text-sm text-emerald-500">{labels.saved}</span>
        )}
      </div>
    </form>
  );
}

function Toggle({
  name,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      {/* Hidden checkbox carries the value; the switch reflects it. */}
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}
