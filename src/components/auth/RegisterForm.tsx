"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabaseConfigured) {
      setError("המערכת עדיין לא חוברה למסד הנתונים.");
      return;
    }
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password.length < 8) {
      setError("הסיסמה צריכה להכיל לפחות 8 תווים.");
      return;
    }
    if (password !== String(data.get("password_confirm") ?? "")) {
      setError("הסיסמאות אינן תואמות.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: result, error: authError } = await supabase.auth.signUp({
      email: String(data.get("email") ?? "").trim(),
      password,
      options: {
        data: {
          first_name: String(data.get("first_name") ?? "").trim(),
          last_name: String(data.get("last_name") ?? "").trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile/edit`,
      },
    });
    setBusy(false);

    if (authError) {
      setError(
        authError.message.toLowerCase().includes("already")
          ? "כתובת המייל כבר רשומה. אפשר להתחבר."
          : "ההרשמה נכשלה. נסי שוב בעוד רגע.",
      );
      return;
    }

    // With email confirmation on, there is no session yet — tell her to check her mail.
    if (!result.session) {
      setNotice("שלחנו לך מייל לאישור הכתובת. אחרי האישור תוכלי להתחבר.");
      return;
    }
    router.push("/profile/edit");
    router.refresh();
  }

  if (notice) {
    return (
      <div className="mx-auto max-w-[420px] text-center">
        <p className="rounded-2xl bg-mint-100 px-5 py-4 text-[15px] font-semibold text-navy">
          {notice}
        </p>
        <Link
          href="/login"
          className="focus-brand mt-5 inline-block rounded text-[15px] font-bold text-primary hover:underline"
        >
          חזרה למסך ההתחברות
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[460px]">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="שם פרטי" name="first_name" required autoComplete="given-name" />
          <Input label="שם משפחה" name="last_name" autoComplete="family-name" />
        </div>
        <Input label="מייל" name="email" type="email" required autoComplete="email" dir="ltr" />
        <Input
          label="סיסמה"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          dir="ltr"
          hint="לפחות 8 תווים"
        />
        <Input
          label="אימות סיסמה"
          name="password_confirm"
          type="password"
          required
          autoComplete="new-password"
          dir="ltr"
        />

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" withArrow={false} className="mt-1 w-full" disabled={busy}>
          {busy ? "נרשמת…" : "מעוניינת להירשם >"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[15px] text-ink/70">
        כבר רשומה?{" "}
        <Link href="/login" className="focus-brand rounded font-bold text-primary hover:underline">
          להתחברות
        </Link>
      </p>
    </div>
  );
}
