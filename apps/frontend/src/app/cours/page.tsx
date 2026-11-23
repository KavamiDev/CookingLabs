import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/app/_service/auth/session";
import { fetchCourses } from "@/app/_service/courses/queries";
import type { Course } from "@/app/_service/courses/service";
import { Button } from "@/components/ui/button";

export default function Courses() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Vos Cours</h1>
      <p className="text-lg text-muted-foreground">
        Bienvenu dans vos cours: Voici une liste exhaustive de vos cours
      </p>
      <Suspense
        fallback={<p className="text-muted-foreground">Chargement de la liste des cours...</p>}
      >
        <CoursesList />
      </Suspense>
    </main>
  );
}

async function CoursesList() {
  const user = await requireUser();

  let courses: Course[] = [];
  try {
    courses = await fetchCourses();
  } catch {
    return <p className="text-red-600">Impossible de charger les cours</p>;
  }
  return (
    <>
      <div>
        {courses.map((course: Course) => (
          <div key={course.id} className="border-b py-4">
            <h2 className="font-semibold text-lg">
              <Link href={`/cours/${course.id}`}>{course.title}</Link>
            </h2>
            <p className="text-muted-foreground">{course.description}</p>
            <p className="text-sm text-muted-foreground">{course.category}</p>
          </div>
        ))}
      </div>
      {/* Only admins can create a course */}
      {user.role === "admin" && (
        <div>
          <Button asChild>
            {/* TODO: rename French URLs (/cours, /creer) to English */}
            <Link href="/cours/creer">Créer un cours</Link>
          </Button>
        </div>
      )}
    </>
  );
}
