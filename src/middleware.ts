import { NextResponse, type NextRequest } from "next/server";

/** Paths that belong to the app; on the public-website-only deployment they lead to the demo request instead. */
const APP_PATHS = ["/app", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/invite", "/two-factor", "/onboarding", "/careers", "/portal", "/interview", "/schedule", "/video"];

/** In the public demo the app is open for the demo login, but nobody can sign up or manage accounts. */
const CLOSED_IN_DEMO = ["/register", "/forgot-password", "/reset-password", "/verify-email", "/invite", "/onboarding", "/two-factor"];

/** Edge guard: unauthenticated users hitting /app are sent to sign-in. Full session checks happen server-side. */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const demo = process.env.NEXT_PUBLIC_PUBLIC_DEMO === "1";
  if (process.env.NEXT_PUBLIC_SITE_ONLY === "1" && demo && CLOSED_IN_DEMO.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/demo";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (process.env.NEXT_PUBLIC_SITE_ONLY === "1" && !demo) {
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
