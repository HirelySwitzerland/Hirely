import { NextResponse, type NextRequest } from "next/server";

/** Edge guard: unauthenticated users hitting /app are sent to sign-in. Full session checks happen server-side. */
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/app") && !req.cookies.get("hirely_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*"] };
