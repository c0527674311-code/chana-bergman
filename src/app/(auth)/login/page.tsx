import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleAuthPanel } from "@/components/auth/GoogleAuthPanel";

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
      subtitle="התחברי עם חשבון הגוגל שלך כדי לצפות ולעדכן את הפרופיל שלך."
    >
      <GoogleAuthPanel next={next} initialError={error} />
    </AuthShell>
  );
}
