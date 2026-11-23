// Reads the courses. Server Components only: it reads the session cookie with cookies()
// from next/headers, so it must never be imported in a "use client" file.
// That is why these functions are not in service.ts, which Client Components import.
import { cookies } from "next/headers";
import { API_URL, type Course, throwApiError } from "./service";

// The Next server calls the API itself, so it must forward the browser's session cookie
async function fetchWithSession(path: string): Promise<Response> {
  const cookieStore = await cookies();
  return fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  });
}

export async function fetchCourses(): Promise<Course[]> {
  const response = await fetchWithSession("/api/courses");
  if (!response.ok) {
    await throwApiError(response, "fetch courses");
  }
  return response.json();
}

export async function fetchCourse(id: string): Promise<Course> {
  const response = await fetchWithSession(`/api/courses/${id}`);
  if (!response.ok) {
    await throwApiError(response, "fetch course");
  }
  return response.json();
}
