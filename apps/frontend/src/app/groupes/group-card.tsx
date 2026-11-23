"use client";
// One group (admins): rename or delete it, add or remove students, open or close courses

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Course } from "@/app/_service/courses/service";
import {
  addStudent,
  closeCourse,
  deleteGroup,
  type Group,
  openCourse,
  removeStudent,
  renameGroup,
  type Student,
  studentLabel,
} from "@/app/_service/groups/service";
import { Button } from "@/components/ui/button";

type GroupCardProps = {
  group: Group;
  // Every student and every course, to choose the ones to add
  students: Student[];
  courses: Course[];
};

export function GroupCard({ group, students, courses }: GroupCardProps) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [studentToAdd, setStudentToAdd] = useState("");
  const [courseToOpen, setCourseToOpen] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Only what is not already in the group can be added
  const otherStudents = students.filter(
    (student) => !group.students.some((member) => member.id === student.id),
  );
  const closedCourses = courses.filter(
    (course) => !group.courses.some((opened) => opened.id === course.id),
  );

  // Runs one API call, shows its error, then reloads the page data from the API
  async function save(apiCall: () => Promise<void>) {
    setError("");
    setIsSaving(true);
    try {
      await apiCall();
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "L'opération a échoué, réessayez");
    } finally {
      setIsSaving(false);
    }
  }

  function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(() => renameGroup(group.id, name));
  }

  function handleAddStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (studentToAdd === "") {
      return;
    }
    save(() => addStudent(group.id, Number(studentToAdd)));
    setStudentToAdd("");
  }

  function handleOpenCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (courseToOpen === "") {
      return;
    }
    save(() => openCourse(group.id, Number(courseToOpen)));
    setCourseToOpen("");
  }

  function handleDelete() {
    if (
      !confirm(`Supprimer le groupe « ${group.name} » ? Ses élèves perdront l'accès à ses cours.`)
    ) {
      return;
    }
    save(() => deleteGroup(group.id));
  }

  const headingId = `group-${group.id}`;
  return (
    // aria-labelledby: screen readers (and the tests) find this block by the group name
    <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 id={headingId} className="font-semibold text-xl">
        {group.name}
      </h2>

      <form onSubmit={handleRename} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          Nom du groupe
          <input
            className="rounded-lg border px-3 py-2"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button type="submit" variant="outline" disabled={isSaving}>
          Renommer
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Élèves ({group.students.length})</h3>
        {group.students.length === 0 && <p className="text-muted-foreground">Aucun élève.</p>}
        <ul className="flex flex-col gap-1">
          {group.students.map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 break-words">{studentLabel(student)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
                aria-label={`Retirer ${student.email} du groupe`}
                onClick={() => save(() => removeStudent(group.id, student.id))}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddStudent} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            Ajouter un élève
            <select
              className="rounded-lg border px-3 py-2"
              value={studentToAdd}
              onChange={(event) => setStudentToAdd(event.target.value)}
            >
              <option value="">Choisir un élève</option>
              {otherStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {studentLabel(student)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={isSaving || studentToAdd === ""}>
            Ajouter
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Cours ouverts ({group.courses.length})</h3>
        {group.courses.length === 0 && <p className="text-muted-foreground">Aucun cours.</p>}
        <ul className="flex flex-col gap-1">
          {group.courses.map((course) => (
            <li key={course.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 break-words">{course.title}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
                aria-label={`Fermer le cours ${course.title} pour ce groupe`}
                onClick={() => save(() => closeCourse(group.id, course.id))}
              >
                Fermer
              </Button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleOpenCourse} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            Ouvrir un cours
            <select
              className="rounded-lg border px-3 py-2"
              value={courseToOpen}
              onChange={(event) => setCourseToOpen(event.target.value)}
            >
              <option value="">Choisir un cours</option>
              {closedCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={isSaving || courseToOpen === ""}>
            Ouvrir
          </Button>
        </form>
      </div>

      {error !== "" && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      <Button variant="destructive" disabled={isSaving} onClick={handleDelete}>
        Supprimer le groupe
      </Button>
    </section>
  );
}
