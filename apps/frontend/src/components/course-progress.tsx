import Link from "next/link";
import type { CourseProgress as Progress } from "@/app/_service/courses/service";
import { Button } from "@/components/ui/button";

// 0 % for a course without lessons (no division by zero)
export function progressPercent({ totalLessons, completedLessons }: Progress): number {
  if (totalLessons === 0) {
    return 0;
  }
  return Math.round((completedLessons / totalLessons) * 100);
}

// "0 leçon sur 5", "1 leçon sur 5", "2 leçons sur 5"
function lessonsText({ totalLessons, completedLessons }: Progress): string {
  const word = completedLessons > 1 ? "leçons" : "leçon";
  return `${completedLessons} ${word} sur ${totalLessons}`;
}

// Progress bar of a student in a course: "40 % · 2 leçons sur 5"
export function ProgressBar({
  progress,
  courseTitle,
}: {
  progress: Progress;
  courseTitle: string;
}) {
  const percent = progressPercent(progress);
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-label={`Progression dans ${courseTitle}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">
        {percent} % · {lessonsText(progress)}
      </p>
    </div>
  );
}

// Link to the first lesson not completed: "Commencer" at the start, "Reprendre" after.
// Nothing when the course is finished or has no lesson.
export function ResumeButton({ courseId, progress }: { courseId: number; progress: Progress }) {
  if (progress.resumeLessonId === null) {
    return null;
  }
  return (
    <div>
      <Button asChild>
        <Link href={`/cours/${courseId}/lecons/${progress.resumeLessonId}`}>
          {progress.completedLessons === 0 ? "Commencer" : "Reprendre"}
        </Link>
      </Button>
    </div>
  );
}
