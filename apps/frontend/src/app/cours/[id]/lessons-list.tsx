import type { Lesson } from "@/app/_service/courses/service";

// Read-only list of the lessons of a course (students)
export function LessonsList({ lessons }: { lessons: Lesson[] }) {
  return (
    <div className="flex flex-col gap-4 border-t pt-6">
      <h2 className="font-semibold text-lg">Leçons</h2>
      {lessons.length === 0 ? (
        <p className="text-muted-foreground">Ce cours n'a pas encore de leçon.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {lessons.map((lesson, index) => (
            <li key={lesson.id}>
              {index + 1}. {lesson.title}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
