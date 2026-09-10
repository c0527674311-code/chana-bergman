import type { Metadata } from "next";
import { Assistant, Poppins } from "next/font/google";
import { ScrollFx } from "@/components/site/ScrollFx";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
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
  metadataBase: new URL(SITE_URL),
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
  // No og title/description here on purpose: Next fills them from each
  // page's own title and description. A fixed og:title made every shared
  // link — a job, an article — preview as the homepage. (A page that sets
  // its own openGraph replaces this whole object, so it repeats these.)
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: SITE_NAME,
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
