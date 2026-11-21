// Who is logged in? Server Components only: it reads the session cookie with cookies()
// from next/headers, so it must never be imported in a "use client" file.
//
// The real check is done by the API (GET /api/auth/me verifies the JWT signature).
// proxy.ts only looks at whether the cookie exists, which is not enough on its own.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { API_URL, throwApiError } from "@/app/_service/courses/service";
import { AUTH_COOKIE, LOGIN_PAGE } from "./cookie";

export interface CurrentUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "admin" | "student";
}

// cache(): the API is called only once per page, even if several components need the user
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  if (!cookieStore.has(AUTH_COOKIE)) {
    return null;
  }

  // The Next server calls the API itself, so it must forward the browser's session cookie
  const response = await fetch(`${API_URL}/api/auth/me`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  });
  // Expired or forged cookie, or deleted account
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    await throwApiError(response, "fetch current user");
  }
  return response.json();
});

// For pages that need a logged-in user: sends visitors to the login page
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(LOGIN_PAGE);
  }
  return user;
}
