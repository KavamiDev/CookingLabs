// Client Component call: the browser sends the file to /api/... (same origin, cookie included).

// File served by the site (apps/frontend/public), with the expected columns
export const STUDENTS_TEMPLATE_URL = "/modele-eleves.csv";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB, same limit as the API
const TOO_BIG = "Le fichier dépasse 1 Mo";

// Same shape as ImportReport in the backend
export type ImportReport = {
  created: number;
  groupsCreated: string[];
  invitationFailures: string[];
};

export type ImportStudentsResult =
  | { ok: true; report: ImportReport }
  | { ok: false; errors: string[] };

export async function importStudents(file: File): Promise<ImportStudentsResult> {
  // Checked here to answer before the upload. The API checks it again.
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, errors: [TOO_BIG] };
  }

  const body = new FormData();
  body.append("file", file);

  try {
    // No Content-Type header: the browser adds the multipart boundary itself
    const response = await fetch("/api/users/import", { method: "POST", body });
    if (response.ok) {
      return { ok: true, report: await response.json() };
    }
    if (response.status === 413) {
      return { ok: false, errors: [TOO_BIG] };
    }
    if (response.status === 400 || response.status === 409) {
      // The API gives the list of errors, with the line numbers
      const { message } = await response.json();
      return { ok: false, errors: Array.isArray(message) ? message : [message] };
    }
    return { ok: false, errors: ["Impossible d'importer les élèves"] };
  } catch {
    return { ok: false, errors: ["Impossible de joindre le serveur."] };
  }
}
