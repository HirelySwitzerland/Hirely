/**
 * Public-website-only mode (NEXT_PUBLIC_SITE_ONLY=1): recruit24.ch shows the marketing site and the
 * demo request; sign-up, login and the app are switched off until the product is ready.
 */
export const SITE_ONLY = process.env.NEXT_PUBLIC_SITE_ONLY === "1";
/**
 * Public demo (NEXT_PUBLIC_PUBLIC_DEMO=1, together with SITE_ONLY): visitors can log in with «Demo» / «demo»
 * and try the app with the demo company. Registration stays closed; the demo data is reset every night.
 */
export const PUBLIC_DEMO = process.env.NEXT_PUBLIC_PUBLIC_DEMO === "1";
/** The demo company's owner account (created by the demo data). */
export const DEMO_EMAIL = "demo@recruit24.ch";
/** In the public demo, nobody may lock the shared demo account (password, two-factor, membership). */
export function isLockedDemoAccount(email: string) {
  return PUBLIC_DEMO && email.toLowerCase() === DEMO_EMAIL;
}
/** Prices on the public website (section, menu and footer). Hidden until NEXT_PUBLIC_SHOW_PRICES=1. */
export const SHOW_PRICES = process.env.NEXT_PUBLIC_SHOW_PRICES === "1";
/** Public contact address shown on the website (imprint, privacy notice, fallback for the demo form). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hallo@recruit24.ch";
export const SITE_URL = "https://recruit24.ch";

/** Company details for the imprint and privacy notice. */
export const COMPANY = {
  name: "Duranovic Digital Services",
  street: "Büchelstrasse 8",
  city: "9464 Rüthi",
  country: "Schweiz",
  uid: "CHE-292.949.232",
  representative: "Kevin Duranovic",
};
