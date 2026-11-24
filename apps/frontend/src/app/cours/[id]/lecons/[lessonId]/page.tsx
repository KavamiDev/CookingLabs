import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/app/_service/auth/session";
import { fetchLesson, type LessonLink } from "@/app/_service/lessons/service";
import { fetchQuizWithAnswers } from "@/app/_service/quizzes/queries";
import { CourseAccessDenied } from "@/components/course-access-denied";
import { Button } from "@/components/ui/button";
import { ImportQuizForm } from "./import-quiz-form";
import { QuizPreview } from "./quiz-preview";

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
  const user = await requireUser();
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

      {user.role === "admin" && <AdminQuiz courseId={lesson.course.id} lessonId={lesson.id} />}

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

// Quiz of the lesson for the admin: preview of the current quiz, and the import form
async function AdminQuiz({ courseId, lessonId }: { courseId: number; lessonId: number }) {
  const quiz = await fetchQuizWithAnswers(courseId, lessonId);
  return (
    <section aria-labelledby="quiz-heading" className="flex flex-col gap-4 border-t pt-6">
      <h2 id="quiz-heading" className="font-semibold text-lg">
        QCM de la leçon
      </h2>
      {quiz ? (
        <QuizPreview quiz={quiz} />
      ) : (
        <p className="text-muted-foreground">Cette leçon n'a pas encore de QCM.</p>
      )}
      <ImportQuizForm courseId={courseId} lessonId={lessonId} hasQuiz={quiz !== null} />
    </section>
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
