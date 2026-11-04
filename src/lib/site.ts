/**
 * Public-website-only mode (NEXT_PUBLIC_SITE_ONLY=1): recruit24.ch shows the marketing site and the
 * demo request; sign-up, login and the app are switched off until the product is ready.
 */
export const SITE_ONLY = process.env.NEXT_PUBLIC_SITE_ONLY === "1";
/** Public contact address shown on the website (imprint, privacy notice, fallback for the demo form). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hallo@recruit24.ch";
export const SITE_URL = "https://recruit24.ch";

/**
 * Company details for the imprint and privacy notice. Values in [brackets] are placeholders
 * and are highlighted on the page until they are filled in.
 */
export const COMPANY = {
  name: "[Firmenname, z. B. Recruit24 GmbH]",
  street: "[Strasse und Nummer]",
  city: "[PLZ Ort]",
  country: "Schweiz",
  uid: "[UID, z. B. CHE-123.456.789]",
  representative: "[Vor- und Nachname, Funktion]",
};
