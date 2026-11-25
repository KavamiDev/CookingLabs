// Client Component call: the browser uses /api/... (same origin, cookie included).
// Not in service.ts, which is for Server Components only.

// Marks the lesson as completed for the logged-in student. Calling it twice is harmless.
export async function markLessonCompleted(courseId: number, lessonId: number): Promise<void> {
  const response = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/progress`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to mark the lesson as completed (${response.status})`);
  }
}
