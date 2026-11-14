//service front poour courses
export interface Lesson {
  id: number;
  title: string;
  position: number;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  lessons?: Lesson[];
}

export async function fetchCourses(): Promise<Course[]> {
  const baseUrl = process.env.API_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/courses`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `❌ Erreur API [${response.status} ${response.statusText}] sur ${response.url}:`,
      errorBody,
    );
    throw new Error(`Failed to fetch courses (${response.status})`);
  }
  return response.json();
}

export async function fetchCourse(id: string): Promise<Course> {
  const baseUrl = process.env.API_URL || "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/courses/${id}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `❌ Erreur API [${response.status} ${response.statusText}] sur ${response.url}:`,
      errorBody,
    );
    throw new Error(`Failed to fetch courses (${response.status})`);
  }
  return response.json();
}

export async function createCourse(title: string, description: string): Promise<Course> {
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
