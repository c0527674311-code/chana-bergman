import type { Metadata } from "next";
import { Assistant, Poppins } from "next/font/google";
import { ScrollFx } from "@/components/site/ScrollFx";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chana-bergman.co.il"),
  title: {
    default: "חנה ברגמן | גיוס והשמה מדויקים בהייטק",
    template: "%s | חנה ברגמן",
  },
  description:
    "40 שנה של היכרות אישית עם השוק. מאגר מתכנתות מהמובילות בארץ, והתאמה מדויקת בין הדרישה שלכם לבין הכישורים שלהן. בדיוק מה שחיפשת.",
  keywords: [
    "גיוס הייטק",
    "השמת מתכנתות",
    "מתכנתות",
    "גיוס מפתחות",
    "חנה ברגמן",
    "קורות חיים הייטק",
    "משרות הייטק לנשים",
  ],
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "חנה ברגמן",
    title: "חנה ברגמן | גיוס והשמה מדויקים בהייטק",
    description:
      "מאגר מתכנתות מהמובילות בארץ והתאמה מדויקת לדרישות שלכם. בדיוק מה שחיפשת.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline script below stamps the `fx` class
    // on <html> before hydration (by design — no reveal-flash), so the
    // server/client className legitimately differ.
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${assistant.variable} ${poppins.variable}`}
    >
      <head>
        {/* Stamps the fx class before first paint, so scroll-reveal styles
            never hide content for no-JS visitors and never flash on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('fx')",
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ScrollFx />
        {children}
      </body>
    </html>
  );
}
