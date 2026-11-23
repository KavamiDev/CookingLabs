import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/app/_service/auth/session";
import { fetchCourse } from "@/app/_service/courses/queries";
import { CourseAccessDenied } from "@/components/course-access-denied";
import { Button } from "@/components/ui/button";
import { EditCourse } from "./edit-course";
import { ImportLessonForm } from "./import-lesson-form";
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
  if (!course) {
    return <CourseAccessDenied />;
  }
  const lessons = course.lessons ?? [];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">{course.title}</h1>
      <p className="text-lg text-muted-foreground">{course.description}</p>
      <p className="text-sm text-muted-foreground">{course.category}</p>
      {/* Admin: reorder and import lessons, edit the course. Student: the list of lessons only */}
      {user.role === "admin" ? (
        <>
          {/* key: LessonsOrder copies the lessons in its state, so restart it when they change */}
          <LessonsOrder
            key={lessons.map((lesson) => lesson.id).join("-")}
            courseId={course.id}
            lessons={lessons}
          />
          <ImportLessonForm courseId={course.id} />
          <EditCourse course={course} />
        </>
      ) : (
        <LessonsList courseId={course.id} lessons={lessons} />
      )}
    </div>
  );
}
