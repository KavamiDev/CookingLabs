// Reads the quizzes. Server Components only: it reads the session cookie with cookies()
// from next/headers, so it must never be imported in a "use client" file.
import { throwApiError } from "@/app/_service/courses/service";
import { fetchWithSession } from "@/app/_service/fetch-with-session";
import type { QuizWithAnswers } from "./service";

// The quiz of a lesson with its right answers (admins only). null: the lesson has no quiz yet.
export async function fetchQuizWithAnswers(
  courseId: number,
  lessonId: number,
): Promise<QuizWithAnswers | null> {
  const response = await fetchWithSession(`/api/courses/${courseId}/lessons/${lessonId}/quiz`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    await throwApiError(response, "fetch quiz");
  }
  return response.json();
}
