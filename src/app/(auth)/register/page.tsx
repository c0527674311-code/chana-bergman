import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "הרשמה לאתר",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthShell
      icon="user"
      title="נעים להכיר!"
      subtitle="פתחי חשבון כדי לנהל את הפרופיל ואת קורות החיים שלך, ולעדכן אותם מתי שתרצי."
      closeHref="/login"
    >
      <RegisterForm />
    </AuthShell>
  );
}
