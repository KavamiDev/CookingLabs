// Progress of one student in one course, computed from the lessons (in course order)
// and the ids of the lessons this student marked as completed
export type CourseProgress = {
  totalLessons: number;
  completedLessons: number;
  // First lesson not completed yet (null when the course is finished or has no lesson)
  resumeLessonId: number | null;
};

export function summarizeProgress(
  orderedLessonIds: number[],
  completedLessonIds: Set<number>,
): CourseProgress {
  const notCompleted = orderedLessonIds.filter((id) => !completedLessonIds.has(id));
  return {
    totalLessons: orderedLessonIds.length,
    completedLessons: orderedLessonIds.length - notCompleted.length,
    resumeLessonId: notCompleted[0] ?? null,
  };
}
