"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolvePostLogin } from "./actions";

type Labels = {
  email: string;
  password: string;
  submit: string;
  error: string;
};

export default function LoginForm({
  locale,
  labels,
}: {
  locale: string;
  labels: Labels;
}) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(labels.error);
        return;
      }
      const target = await resolvePostLogin(locale);
      window.location.assign(target);
    });
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="email">
          {labels.email}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="password">
          {labels.password}
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
      </div>
      {errorMsg && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium shadow-sm hover:opacity-90 disabled:opacity-60 transition"
      >
        {isPending ? "…" : labels.submit}
      </button>
    </form>
  );
}
