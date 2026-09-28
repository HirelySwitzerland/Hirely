import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hirely — Your AI Recruiting Employee", template: "%s · Hirely" },
  description: "Hirely automates the repetitive parts of recruiting — from application screening to AI interviews and interview scheduling — so your HR team can focus on people, not paperwork.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#2B4ACB", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
