// Reads the groups and the students. Server Components only (cookies() from next/headers).
import { throwApiError } from "@/app/_service/courses/service";
import { fetchWithSession } from "@/app/_service/fetch-with-session";
import type { Group, Student } from "./service";

export async function fetchGroups(): Promise<Group[]> {
  const response = await fetchWithSession("/api/groups");
  if (!response.ok) {
    await throwApiError(response, "fetch groups");
  }
  return response.json();
}

export async function fetchStudents(): Promise<Student[]> {
  const response = await fetchWithSession("/api/users/students");
  if (!response.ok) {
    await throwApiError(response, "fetch students");
  }
  return response.json();
}
