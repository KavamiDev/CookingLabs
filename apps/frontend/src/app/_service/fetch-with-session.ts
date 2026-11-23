// Server Components only: it reads the session cookie with cookies() from next/headers,
// so it must never be imported in a "use client" file.
import { cookies } from "next/headers";
import { API_URL } from "./courses/service";

// The Next server calls the API itself, so it must forward the browser's session cookie
export async function fetchWithSession(path: string): Promise<Response> {
  const cookieStore = await cookies();
  return fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  });
}
