// Front-end service for courses.
//
// Two ways to call the API, on purpose:
// - Server Components read through queries.ts: fetch needs an absolute URL (API_URL) and
//   the session cookie must be forwarded by hand.
// - Client Components (create, update, delete, reorder) run in the browser and use the
//   relative path /api/...: next.config.ts rewrites it to the API. Same origin, so no CORS
//   and the session cookie is sent automatically.
export interface Lesson {
  id: number;
  title: string;
  position: number;
  // Only in the course details: did the logged-in user mark this lesson as completed?
  completed?: boolean;
}

// Progress of the logged-in user in a course, computed by the API
export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  // First lesson not completed yet (null when the course is finished or has no lesson)
  resumeLessonId: number | null;
}

// A course as GET /api/courses and GET /api/courses/:id return it, with the user's progress
export interface Course extends CourseProgress {
  id: number;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  lessons?: Lesson[];
}

// Same default as next.config.ts: the NestJS API runs on port 3001 in local development.
export const API_URL = process.env.API_URL ?? "http://localhost:3001";

// Logs the API error on the Next server, then throws so the page can show an error state.
export async function throwApiError(response: Response, action: string): Promise<never> {
  const errorBody = await response.text();
  console.error(`API error [${response.status}] on ${response.url}:`, errorBody);
  throw new Error(`Failed to ${action} (${response.status})`);
}

export async function createCourse(title: string, description: string): Promise<{ id: number }> {
  const response = await fetch("/api/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create course (${response.status})`);
  }
  return response.json();
}

export async function updateCourse(id: number, title: string, description: string) {
  const response = await fetch(`/api/courses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update course (${response.status})`);
  }
  return response.json();
}

export async function deleteCourse(id: number) {
  const response = await fetch(`/api/courses/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete course (${response.status})`);
  }
}

export async function reorderLessons(courseId: number, lessons: Lesson[]) {
  const body = {
    lessons: lessons.map((lesson, index) => ({
      id: lesson.id,
      position: index + 1,
    })),
  };

  const response = await fetch(`/api/courses/${courseId}/lessons/order`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to reorder lessons (${response.status})`);
  }
}
