import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContext } from "@/lib/auth/session";
import { OAUTH_CONFIG } from "@/lib/providers/calendar";
import { encrypt, safeEqual } from "@/lib/crypto";
import { appUrl } from "@/lib/services/communication";
import { audit, userActor } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const ctx = await getContext();
  const u = new URL(req.url);
  const jar = await cookies();
  const [state, orgId] = (jar.get("hirely_oauth_state")?.value ?? ":").split(":");
  jar.delete("hirely_oauth_state");
  if (!state || !safeEqual(state, u.searchParams.get("state") ?? "") || orgId !== ctx.orgId) return NextResponse.redirect(appUrl("/app/integrations?error=oauth_state"));
  const cfg = OAUTH_CONFIG[provider as "google" | "microsoft"];
  const code = u.searchParams.get("code");
  if (!cfg || !code) return NextResponse.redirect(appUrl("/app/integrations?error=oauth_denied"));
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: cfg.clientId()!, client_secret: cfg.clientSecret()!, redirect_uri: appUrl(`/api/integrations/oauth/${provider}/callback`), grant_type: "authorization_code" }),
  });
  const tok = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !tok.access_token) {
    await db.integration.upsert({ where: { orgId_kind_provider: { orgId: ctx.orgId, kind: "CALENDAR", provider } }, create: { orgId: ctx.orgId, kind: "CALENDAR", provider, status: "ERROR", lastError: tok.error_description ?? "Token exchange failed" }, update: { status: "ERROR", lastError: tok.error_description ?? "Token exchange failed" } });
    return NextResponse.redirect(appUrl("/app/integrations?error=oauth_token"));
  }
  const secrets = encrypt(JSON.stringify({ accessToken: tok.access_token, refreshToken: tok.refresh_token, expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000 }));
  const integ = await db.integration.upsert({
    where: { orgId_kind_provider: { orgId: ctx.orgId, kind: "CALENDAR", provider } },
    create: { orgId: ctx.orgId, kind: "CALENDAR", provider, status: "CONNECTED", secretsEnc: secrets, config: { demo: false, connectedBy: ctx.user.name } },
    update: { status: "CONNECTED", secretsEnc: secrets, lastError: null, config: { demo: false, connectedBy: ctx.user.name } },
  });
  await audit(ctx.orgId, userActor(ctx.user), "integration.connected", { type: "Integration", id: integ.id, label: `CALENDAR · ${provider}` });
  return NextResponse.redirect(appUrl("/app/integrations?connected=" + provider));
}
