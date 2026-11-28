// Runs before every page: a visitor without a session cookie is sent to the login page
// (except on the public pages: login and activation of an invited account).
// This is only a quick check (the cookie exists). Each page then asks the API who the user
// really is (requireUser in _service/auth/session.ts), as the Next.js docs recommend.
import { type NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, LOGIN_PAGE, PUBLIC_PAGES } from "@/app/_service/auth/cookie";

export function proxy(request: NextRequest) {
  const isPublicPage = PUBLIC_PAGES.includes(request.nextUrl.pathname);
  const hasSessionCookie = request.cookies.has(AUTH_COOKIE);

  if (!hasSessionCookie && !isPublicPage) {
    return NextResponse.redirect(new URL(LOGIN_PAGE, request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Every page except: /api (the API protects itself), Next.js build files, and files with an
  // extension (favicon.ico, images...)
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
