import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "התחברות",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <AuthShell
      icon="thumb"
      title="כיף שאת פה - איתנו!"
      subtitle="התחברי לאתר ותוכלי לצפות ולעדכן את פרופיל המשתמש שלך באתר."
    >
      <LoginForm next={next} initialError={error} />
    </AuthShell>
  );
}
