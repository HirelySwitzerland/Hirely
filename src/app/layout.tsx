import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Recruit24 – Recruiting rund um die Uhr", template: "%s · Recruit24" },
  applicationName: "Recruit24",
  appleWebApp: { capable: true, title: "Recruit24", statusBarStyle: "default" },
  openGraph: {
    type: "website", locale: "de_CH", siteName: "Recruit24", url: SITE_URL,
    title: "Recruit24 – Recruiting rund um die Uhr, automatisiert",
    description: "Recruit24 prüft jede Bewerbung, führt das Vorabgespräch und vereinbart den Termin – rund um die Uhr. Mehr Zeit für das Wichtige, Entscheide auch unterwegs auf dem Handy.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Recruit24 – Ihr KI-Mitarbeiter fürs Recruiting" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  description: "Recruit24 prüft jede Bewerbung, führt das Vorabgespräch und vereinbart den Termin – rund um die Uhr. Ihr Team gewinnt Zeit für das Wichtige und entscheidet, auch unterwegs auf dem Handy.",
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
