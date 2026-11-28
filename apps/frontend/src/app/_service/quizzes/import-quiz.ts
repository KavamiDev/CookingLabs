// Client Component call: the browser sends the file to /api/... (same origin, cookie included).
// Not in queries.ts, which is for Server Components only.

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB, same limit as the API
const TOO_BIG = "Le fichier dépasse 1 Mo";

// errors: every problem found in the file, to show them all at once
export type ImportQuizResult = { ok: true } | { ok: false; errors: string[] };

export async function importQuiz(
  courseId: number,
  lessonId: number,
  file: File,
): Promise<ImportQuizResult> {
  // Checked here to answer before the upload. The API checks it again.
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, errors: [TOO_BIG] };
  }

  const body = new FormData();
  body.append("file", file);

  // No Content-Type header: the browser adds the multipart boundary itself
  const response = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz/import`, {
    method: "POST",
    body,
  });

  if (response.status === 413) {
    return { ok: false, errors: [TOO_BIG] };
  }
  // 400: invalid file, 409: students already answered the current quiz.
  // The API explains in French what is wrong (a string, or a list for the file content).
  if (response.status === 400 || response.status === 409) {
    const { message } = await response.json();
    return { ok: false, errors: Array.isArray(message) ? message : [message] };
  }
  if (!response.ok) {
    return { ok: false, errors: ["Impossible d'importer le QCM"] };
  }
  return { ok: true };
}
