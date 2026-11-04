import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Recruit24 – Ihr KI-Recruiting-Mitarbeiter", template: "%s · Recruit24" },
  openGraph: {
    type: "website", locale: "de_CH", siteName: "Recruit24", url: SITE_URL,
    title: "Recruit24 – Ihr KI-Mitarbeiter fürs Recruiting",
    description: "Prüft Bewerbungen, führt das Vorabgespräch am Telefon oder online und vereinbart Termine – rund um die Uhr. Entscheiden tun immer Sie.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Recruit24 – Ihr KI-Mitarbeiter fürs Recruiting" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  description: "Recruit24 übernimmt die repetitive Recruiting-Arbeit – von der Bewerbungsprüfung über KI-Interviews bis zur Terminvereinbarung –, damit sich Ihr HR-Team auf Menschen konzentrieren kann.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#1D2130", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
