// Front-end service for groups (admins). Client Components call these functions: the browser
// uses the relative path /api/... (next.config.ts rewrites it to the API, cookie included).

// A student, as the API returns it (no password, no token)
export interface Student {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface Group {
  id: number;
  name: string;
  students: Student[];
  courses: { id: number; title: string }[];
}

// "Élève CookingLabs (test@cookinglabs.local)", or the email alone when there is no name
export function studentLabel(student: Student): string {
  const name = [student.firstName, student.lastName].filter(Boolean).join(" ");
  return name === "" ? student.email : `${name} (${student.email})`;
}

// Sends the request and throws an Error with a French message when the API refuses it
async function sendGroupRequest(path: string, method: string, body?: object): Promise<void> {
  const response = await fetch(`/api/groups${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.ok) {
    return;
  }

  // 400 and 409: the API explains in French what is wrong (a string, or a list)
  if (response.status === 400 || response.status === 409) {
    const { message } = await response.json();
    throw new Error(Array.isArray(message) ? message[0] : message);
  }
  throw new Error("L'opération a échoué, réessayez");
}

export function createGroup(name: string) {
  return sendGroupRequest("", "POST", { name });
}

export function renameGroup(groupId: number, name: string) {
  return sendGroupRequest(`/${groupId}`, "PATCH", { name });
}

export function deleteGroup(groupId: number) {
  return sendGroupRequest(`/${groupId}`, "DELETE");
}

export function addStudent(groupId: number, studentId: number) {
  return sendGroupRequest(`/${groupId}/students/${studentId}`, "PUT");
}

export function removeStudent(groupId: number, studentId: number) {
  return sendGroupRequest(`/${groupId}/students/${studentId}`, "DELETE");
}

export function openCourse(groupId: number, courseId: number) {
  return sendGroupRequest(`/${groupId}/courses/${courseId}`, "PUT");
}

export function closeCourse(groupId: number, courseId: number) {
  return sendGroupRequest(`/${groupId}/courses/${courseId}`, "DELETE");
}
