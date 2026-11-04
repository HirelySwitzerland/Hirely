import { NextResponse, type NextRequest } from "next/server";

/** Paths that belong to the app; on the public-website-only deployment they lead to the demo request instead. */
const APP_PATHS = ["/app", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/invite", "/two-factor", "/onboarding", "/careers", "/portal", "/interview", "/schedule", "/video"];

/** Edge guard: unauthenticated users hitting /app are sent to sign-in. Full session checks happen server-side. */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (process.env.NEXT_PUBLIC_SITE_ONLY === "1") {
    if (path.startsWith("/api/")) return new NextResponse(null, { status: 404 });
    if (APP_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
      const url = req.nextUrl.clone();
      url.pathname = "/demo";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (path.startsWith("/app") && !req.cookies.get("hirely_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*", "/api/:path*", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email/:path*", "/invite/:path*", "/two-factor",
    "/onboarding/:path*", "/careers/:path*", "/portal/:path*", "/interview/:path*", "/schedule/:path*", "/video/:path*",
  ],
};
