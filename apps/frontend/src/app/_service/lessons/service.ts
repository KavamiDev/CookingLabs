// Front-end service for lessons. Server Components only: it reads the session cookie with
// cookies() from next/headers, so it must never be imported in a "use client" file.
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LOGIN_PAGE } from "@/app/_service/auth/cookie";
import { API_URL, throwApiError } from "@/app/_service/courses/service";

// Previous / next lesson in the course (null at the start / end of the course)
export interface LessonLink {
  id: number;
  title: string;
}

export interface LessonDetails {
  id: number;
  title: string;
  position: number;
  // HTML already cleaned by the API (sanitize-html): safe to display
  htmlContent: string;
  course: { id: number; title: string };
  previousLesson: LessonLink | null;
  nextLesson: LessonLink | null;
}

export async function fetchLesson(courseId: string, lessonId: string): Promise<LessonDetails> {
  // The Next server calls the API itself, so it must forward the browser's session cookie
  const cookieStore = await cookies();
  const response = await fetch(`${API_URL}/api/courses/${courseId}/lessons/${lessonId}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  });

  // Not logged in: go to the login page
  if (response.status === 401) {
    redirect(LOGIN_PAGE);
  }
  // Unknown lesson, or lesson of another course: show the 404 page
  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    await throwApiError(response, "fetch lesson");
  }
  return response.json();
}
