// Reads the courses. Server Components only: it reads the session cookie with cookies()
// from next/headers, so it must never be imported in a "use client" file.
// That is why these functions are not in service.ts, which Client Components import.
import { notFound, redirect } from "next/navigation";
import { LOGIN_PAGE } from "@/app/_service/auth/cookie";
import { fetchWithSession } from "@/app/_service/fetch-with-session";
import { type Course, throwApiError } from "./service";

// The courses this user can read: all of them for an admin, those of their groups for a student
export async function fetchCourses(): Promise<Course[]> {
  const response = await fetchWithSession("/api/courses");
  if (!response.ok) {
    await throwApiError(response, "fetch courses");
  }
  return response.json();
}

// null: the course is not open to the student's groups (403 from the API)
export async function fetchCourse(id: string): Promise<Course | null> {
  const response = await fetchWithSession(`/api/courses/${id}`);

  // Not logged in: go to the login page
  if (response.status === 401) {
    redirect(LOGIN_PAGE);
  }
  if (response.status === 403) {
    return null;
  }
  // Unknown course: show the 404 page
  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    await throwApiError(response, "fetch course");
  }
  return response.json();
}
