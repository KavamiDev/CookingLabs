import { Suspense } from "react";
import { requireUser } from "@/app/_service/auth/session";
import { fetchCourses } from "@/app/_service/courses/queries";
import { fetchGroups, fetchStudents } from "@/app/_service/groups/queries";
import { AccessDenied } from "@/components/access-denied";
import { CreateGroupForm } from "./create-group-form";
import { GroupCard } from "./group-card";
import { ImportStudentsForm } from "./import-students-form";

export default function GroupsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-24">
      <Suspense fallback={<p className="text-muted-foreground">Chargement des groupes...</p>}>
        <AdminOnlyGroups />
      </Suspense>
    </main>
  );
}

// Admin only: a student who types the URL sees a message instead of the groups
async function AdminOnlyGroups() {
  const user = await requireUser();
  if (user.role !== "admin") {
    return <AccessDenied />;
  }

  // The three lists at the same time, not one after the other
  const [groups, students, courses] = await Promise.all([
    fetchGroups(),
    fetchStudents(),
    fetchCourses(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">Groupes</h1>
        <p className="text-muted-foreground">
          Un élève voit les cours ouverts à ses groupes, et seulement ceux-là.
        </p>
      </div>

      <ImportStudentsForm />
      <CreateGroupForm />

      {groups.length === 0 && <p className="text-muted-foreground">Aucun groupe pour le moment.</p>}
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} students={students} courses={courses} />
      ))}
    </>
  );
}
