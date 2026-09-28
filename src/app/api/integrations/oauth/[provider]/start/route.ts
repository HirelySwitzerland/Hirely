import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth/session";
import { OAUTH_CONFIG } from "@/lib/providers/calendar";
import { randomToken } from "@/lib/crypto";
import { appUrl } from "@/lib/services/communication";

export async function GET(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const ctx = await getContext();
  if (!ctx.can("integrations.manage")) return new NextResponse("Forbidden", { status: 403 });
  const cfg = OAUTH_CONFIG[provider as "google" | "microsoft"];
  if (!cfg?.clientId()) return NextResponse.redirect(appUrl("/app/integrations?error=oauth_not_configured"));
  const state = randomToken(16);
  (await cookies()).set("hirely_oauth_state", `${state}:${ctx.orgId}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  const url = new URL(cfg.authUrl);
  url.search = new URLSearchParams({ client_id: cfg.clientId()!, redirect_uri: appUrl(`/api/integrations/oauth/${provider}/callback`), response_type: "code", scope: cfg.scope, state, access_type: "offline", prompt: "consent" }).toString();
  return NextResponse.redirect(url);
}
