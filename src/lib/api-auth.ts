import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

export type ApiAuth = { orgId: string; keyId: string; scopes: string[] };

/** Bearer API-key authentication for the public REST API. Keys are stored hashed. */
export async function authenticateApi(req: Request, scope: string): Promise<ApiAuth | Response> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith("hly_")) return Response.json({ error: "Missing or malformed API key." }, { status: 401 });
  const key = await db.apiKey.findUnique({ where: { keyHash: sha256(token) } });
  if (!key || key.revokedAt) return Response.json({ error: "Invalid or revoked API key." }, { status: 401 });
  if (!key.scopes.includes(scope)) return Response.json({ error: `API key lacks scope "${scope}".` }, { status: 403 });
  const rl = rateLimit(`api:${key.id}`, 120, 60_000);
  if (!rl.ok) return Response.json({ error: "Rate limit exceeded." }, { status: 429, headers: { "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) } });
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return { orgId: key.orgId, keyId: key.id, scopes: key.scopes };
}
