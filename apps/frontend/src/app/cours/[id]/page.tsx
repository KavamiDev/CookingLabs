import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/app/_service/auth/session";
import { fetchCourse } from "@/app/_service/courses/queries";
import { Button } from "@/components/ui/button";
import { EditCourse } from "./edit-course";
import { LessonsList } from "./lessons-list";
import { LessonsOrder } from "./lessons-order";

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <Suspense fallback={<p className="text-muted-foreground">Chargement du cours...</p>}>
        <CourseDetails params={params} />
      </Suspense>
      <div className="flex justify-center">
        <Button asChild size="lg">
          <Link href="/cours">Retour à la liste des cours</Link>
        </Button>
      </div>
    </main>
  );
}

async function CourseDetails({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const course = await fetchCourse(id);
  const lessons = course.lessons ?? [];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">{course.title}</h1>
      <p className="text-lg text-muted-foreground">{course.description}</p>
      <p className="text-sm text-muted-foreground">{course.category}</p>
      {/* Admin: reorder the lessons and edit the course. Student: the list of lessons only */}
      {user.role === "admin" ? (
        <>
          <LessonsOrder courseId={course.id} lessons={lessons} />
          <EditCourse course={course} />
        </>
      ) : (
        <LessonsList lessons={lessons} />
      )}
    </div>
  );
}
