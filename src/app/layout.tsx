import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hirely – Ihr KI-Recruiting-Mitarbeiter", template: "%s · Hirely" },
  description: "Hirely übernimmt die repetitive Recruiting-Arbeit – von der Bewerbungsprüfung über KI-Interviews bis zur Terminvereinbarung –, damit sich Ihr HR-Team auf Menschen konzentrieren kann.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#5B4AD8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
