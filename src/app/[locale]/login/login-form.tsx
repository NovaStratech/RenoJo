"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Labels = {
  email: string;
  password: string;
  submit: string;
  magicLink: string;
  error: string;
};

export default function LoginForm({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setInfo(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(labels.error);
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  function handleMagicLink() {
    setErrorMsg(null);
    setInfo(null);
    if (!email) {
      setErrorMsg(labels.error);
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });
      if (error) {
        setErrorMsg(labels.error);
        return;
      }
      setInfo("✓");
    });
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-1">
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
          className="w-full px-3 py-2 rounded-md border border-input bg-background"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="password">
          {labels.password}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background"
        />
      </div>
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      {info && <p className="text-sm text-muted-foreground">{info}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
      >
        {labels.submit}
      </button>
      <button
        type="button"
        onClick={handleMagicLink}
        disabled={isPending}
        className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md border border-border font-medium hover:bg-accent disabled:opacity-60"
      >
        {labels.magicLink}
      </button>
    </form>
  );
}
