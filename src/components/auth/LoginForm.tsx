"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export function LoginForm({
  next = "/profile",
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabaseConfigured) {
      setError("המערכת עדיין לא חוברה למסד הנתונים.");
      return;
    }
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    });
    setBusy(false);

    if (authError) {
      setError(
        authError.message.toLowerCase().includes("invalid")
          ? "המייל או הסיסמה אינם נכונים."
          : "ההתחברות נכשלה. נסי שוב בעוד רגע.",
      );
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function withGoogle() {
    if (!supabaseConfigured) {
      setError("המערכת עדיין לא חוברה למסד הנתונים.");
      return;
    }
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (authError) setError("ההתחברות עם גוגל נכשלה.");
  }

  return (
    <div className="mx-auto max-w-[420px]">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="מייל" name="email" type="email" required autoComplete="email" dir="ltr" />
        <Input
          label="סיסמה"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
        />

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" withArrow={false} className="mt-1 w-full" disabled={busy}>
          {busy ? "מתחברת…" : "מעוניינת להתחבר >"}
        </Button>

        <Link
          href="/forgot-password"
          className="focus-brand mx-auto rounded text-[14px] text-ink/60 underline-offset-4 hover:text-primary hover:underline"
        >
          שכחתי סיסמה
        </Link>
      </form>

      <div className="mt-8 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-ink/15" />
        <span className="text-[20px] font-bold text-navy">עדיין לא רשומה?</span>
        <span className="h-px flex-1 bg-ink/15" />
      </div>

      <Link
        href="/register"
        className="focus-brand mt-3 block rounded text-center text-[15px] font-bold text-navy hover:text-primary"
      >
        לחצי כאן להרשמה לאתר &gt;
      </Link>

      <button
        type="button"
        onClick={withGoogle}
        className="focus-brand mt-5 flex h-[52px] w-full items-center justify-center gap-3 rounded-full border border-ink/20 bg-white text-[15px] text-ink transition-colors hover:bg-canvas"
      >
        <GoogleIcon />
        <span>התחברות עם גוגל</span>
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
