import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/app/_service/auth/session";
import { fetchLesson, type LessonLink } from "@/app/_service/lessons/service";
import { CourseAccessDenied } from "@/components/course-access-denied";
import { Button } from "@/components/ui/button";

type LessonParams = Promise<{ id: string; lessonId: string }>;

export default function LessonPage({ params }: { params: LessonParams }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
      <Suspense fallback={<p className="text-muted-foreground">Chargement de la leçon...</p>}>
        <LessonDetails params={params} />
      </Suspense>
    </main>
  );
}

async function LessonDetails({ params }: { params: LessonParams }) {
  await requireUser();
  const { id, lessonId } = await params;
  const lesson = await fetchLesson(id, lessonId);
  if (!lesson) {
    return (
      <>
        <CourseAccessDenied />
        <div>
          <Button asChild>
            <Link href="/cours">Retour à la liste des cours</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link href={`/cours/${lesson.course.id}`} className="text-sm text-muted-foreground">
          ← {lesson.course.title}
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {lesson.title}
        </h1>
      </div>

      {/* The API cleans this HTML with sanitize-html (no scripts, no onclick...) before sending it */}
      <article
        className="lesson-content"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized by the API
        dangerouslySetInnerHTML={{ __html: lesson.htmlContent }}
      />

      <nav
        aria-label="Navigation entre les leçons"
        className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between"
      >
        <LessonButton
          courseId={lesson.course.id}
          lesson={lesson.previousLesson}
          label="Leçon précédente"
        />
        <LessonButton
          courseId={lesson.course.id}
          lesson={lesson.nextLesson}
          label="Leçon suivante"
        />
      </nav>
    </>
  );
}

// Link to the previous / next lesson, or nothing at the start / end of the course
function LessonButton({
  courseId,
  lesson,
  label,
}: {
  courseId: number;
  lesson: LessonLink | null;
  label: string;
}) {
  if (!lesson) {
    return <div />;
  }
  return (
    <Button
      asChild
      variant="outline"
      className="h-auto flex-col items-start whitespace-normal py-2"
    >
      <Link href={`/cours/${courseId}/lecons/${lesson.id}`}>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span>{lesson.title}</span>
      </Link>
    </Button>
  );
}
