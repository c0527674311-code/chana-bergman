import type { MetadataRoute } from "next";

/** PWA/install metadata — also what Android and search results use for the icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "חנה ברגמן | השמה מדויקת בהייטק",
    short_name: "חנה ברגמן",
    description:
      "מאגר מתכנתות והשמה מדויקת בהייטק. שליחת קורות חיים, בונה קורות חיים, ומשרות פתוחות.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6c83d0",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
