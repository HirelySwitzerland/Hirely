import { db } from "@/lib/db";
import { gradedReferences, type ReferenceGrade } from "./reference-grade";

/**
 * The AI-refined reference grades stored with the latest analysis of each application, keyed by application id.
 * Reads only the «references» part of the JSON, so long lists stay light.
 */
export async function storedReferenceGrades(applicationIds: string[]): Promise<Map<string, Record<string, ReferenceGrade>>> {
  const out = new Map<string, Record<string, ReferenceGrade>>();
  if (!applicationIds.length) return out;
  const rows = await db.$queryRaw<{ applicationId: string; refs: Record<string, ReferenceGrade> | null }[]>`
    SELECT DISTINCT ON ("applicationId") "applicationId", "data"->'references' AS refs
    FROM "CvAnalysis" WHERE "applicationId" = ANY(${applicationIds}) ORDER BY "applicationId", "createdAt" DESC`;
  for (const r of rows) if (r.refs && Object.keys(r.refs).length) out.set(r.applicationId, r.refs);
  return out;
}

/** The grade to show next to a name: the first reference that has one. */
export function headlineGrade(docs: Parameters<typeof gradedReferences>[0], stored: Record<string, ReferenceGrade> | undefined): number | null {
  return gradedReferences(docs, stored).find((r) => r.grade?.overall != null)?.grade?.overall ?? null;
}
