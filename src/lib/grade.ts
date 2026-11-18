/**
 * Formatting of Swiss grades (6 = best, 4 = sufficient). Tiny and dependency-free, so client components
 * such as the candidate list can use it without loading the reference rules.
 */

/** Swiss wording of a grade: 6 sehr gut, 5 gut, 4 genügend, 3 ungenügend … */
export function gradeLabel(g: number | null | undefined): string {
  if (g == null) return "keine Note";
  if (g >= 6) return "sehr gut";
  if (g >= 5.5) return "gut bis sehr gut";
  if (g >= 5) return "gut";
  if (g >= 4.5) return "befriedigend";
  if (g >= 4) return "genügend";
  if (g >= 3) return "ungenügend";
  return "schwach";
}

/** «5.5» – with a dot, as Swiss grades are usually written. */
export function fmtGrade(g: number | null | undefined): string {
  return g == null ? "–" : Number.isInteger(g) ? String(g) : g.toFixed(1);
}

/** Traffic-light tone for a grade, shared by the profile, the document viewer, the list and the dossier. */
export function gradeTone(g: number | null | undefined): "CONFIRMED" | "PARTIAL" | "NOT_MET" | "UNKNOWN" {
  if (g == null) return "UNKNOWN";
  return g >= 5.5 ? "CONFIRMED" : g >= 4 ? "PARTIAL" : "NOT_MET";
}
