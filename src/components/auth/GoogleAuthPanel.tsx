"use client";

import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

/**
 * The only way into an account: Google.
 *
 * Passwords were removed deliberately — there is no password to reset, leak or
 * support, and the candidate never has to invent one. Sign-in and sign-up are
 * the same button: Supabase creates the account on first Google login.
 *
 * Note this gates *accounts only*. Submitting a CV at /submit-cv stays fully
 * anonymous, so a candidate without a Google account is never blocked from the
 * thing that matters.
 */
export function GoogleAuthPanel({
  next = "/profile",
  initialError,
  cta = "התחברות עם גוגל",
}: {
  next?: string;
  initialError?: string;
  cta?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState(false);

  async function withGoogle() {
    if (!supabaseConfigured) {
      setError("המערכת עדיין לא חוברה למסד הנתונים.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (authError) {
      setError("ההתחברות עם גוגל נכשלה. נסי שוב בעוד רגע.");
      setBusy(false);
    }
    // On success the browser leaves for Google — no need to clear `busy`.
  }

  return (
    <div className="mx-auto max-w-[420px]">
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={withGoogle}
        disabled={busy}
        className="focus-brand flex h-[56px] w-full items-center justify-center gap-3 rounded-full border border-ink/20 bg-white text-[16px] font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-60"
      >
        <GoogleIcon />
        <span>{busy ? "מעבירה לגוגל…" : cta}</span>
      </button>

      <p className="mt-5 text-center text-[14px] leading-relaxed text-ink/60">
        אין סיסמאות לזכור — נכנסים עם חשבון הגוגל שלך. אם עוד אין לך חשבון כאן, הוא
        ייפתח אוטומטית בכניסה הראשונה.
      </p>

      <p className="mt-6 rounded-2xl bg-canvas px-5 py-4 text-center text-[14px] leading-relaxed text-ink/70">
        רוצה רק לשלוח קורות חיים?{" "}
        <a
          href="/submit-cv"
          className="focus-brand rounded font-semibold text-primary hover:underline"
        >
          אפשר בלי להתחבר בכלל &gt;
        </a>
      </p>
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
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
