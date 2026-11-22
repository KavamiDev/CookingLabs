// Client Component call: the browser sends the file to /api/... (same origin, cookie included).
// Not in service.ts, which is for Server Components only.

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB, same limit as the API
const TOO_BIG = "Le fichier dépasse 1 Mo";

export type ImportResult = { lessonId: number } | { error: string };

export async function importLesson(
  courseId: number,
  title: string,
  file: File,
): Promise<ImportResult> {
  // Checked here to answer before the upload. The API checks it again.
  if (file.size > MAX_FILE_SIZE) {
    return { error: TOO_BIG };
  }

  const body = new FormData();
  body.append("title", title);
  body.append("file", file);

  // No Content-Type header: the browser adds the multipart boundary itself
  const response = await fetch(`/api/courses/${courseId}/lessons/import`, { method: "POST", body });

  if (response.status === 413) {
    return { error: TOO_BIG };
  }
  if (response.status === 400) {
    // The API explains in French what is wrong (a string, or a list for the title)
    const { message } = await response.json();
    return { error: Array.isArray(message) ? message[0] : message };
  }
  if (!response.ok) {
    return { error: "Impossible d'importer la leçon" };
  }
  const lesson: { id: number } = await response.json();
  return { lessonId: lesson.id };
}
