/** Helpers for the candidate dossier – the one-page profile HR and agencies pass on to line managers and clients. */

/** Short, stable reference used instead of the name in the anonymised dossier, e.g. «R24-7KQ2D». */
export const dossierRef = (applicationId: string) => `R24-${applicationId.slice(-5).toUpperCase()}`;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replaces names, employers and other identifying words with neutral placeholders.
 * Whole words only (also for umlauts), longest match first, case-insensitive.
 */
export function makeScrubber(groups: { placeholder: string; terms: (string | null | undefined)[] }[]) {
  const pairs = groups
    .flatMap((g) => g.terms.map((t) => [t?.trim() ?? "", g.placeholder] as const))
    .filter(([t]) => t.length >= 2)
    .sort((a, b) => b[0].length - a[0].length);
  if (!pairs.length) return (s: string) => s;
  const byTerm = new Map(pairs.map(([t, p]) => [t.toLowerCase(), p]));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...byTerm.keys()].map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return (s: string) => s.replace(re, (m) => byTerm.get(m.toLowerCase()) ?? "[…]").replace(/(\[(?:Name|Firma|Ort|Kontakt)\])(\s+\1)+/g, "$1");
}
