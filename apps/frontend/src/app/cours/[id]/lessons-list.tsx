import Link from "next/link";
import type { Lesson } from "@/app/_service/courses/service";

// Read-only list of the lessons of a course (students): each title opens the lesson
export function LessonsList({ courseId, lessons }: { courseId: number; lessons: Lesson[] }) {
  return (
    <div className="flex flex-col gap-4 border-t pt-6">
      <h2 className="font-semibold text-lg">Leçons</h2>
      {lessons.length === 0 ? (
        <p className="text-muted-foreground">Ce cours n'a pas encore de leçon.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {lessons.map((lesson, index) => (
            <li key={lesson.id}>
              <Link href={`/cours/${courseId}/lecons/${lesson.id}`} className="hover:underline">
                {index + 1}. {lesson.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
