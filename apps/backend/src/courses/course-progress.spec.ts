import { summarizeProgress } from "./course-progress.js";

describe("summarizeProgress", () => {
  it("counts the completed lessons and resumes at the first one not completed", () => {
    expect(summarizeProgress([10, 11, 12, 13, 14], new Set([10, 12]))).toEqual({
      totalLessons: 5,
      completedLessons: 2,
      resumeLessonId: 11,
    });
  });

  it("starts at the first lesson when nothing is completed", () => {
    expect(summarizeProgress([10, 11], new Set())).toEqual({
      totalLessons: 2,
      completedLessons: 0,
      resumeLessonId: 10,
    });
  });

  it("has nothing to resume when every lesson is completed", () => {
    expect(summarizeProgress([10, 11], new Set([10, 11])).resumeLessonId).toBeNull();
  });

  it("gives 0 lessons for a course without lessons", () => {
    expect(summarizeProgress([], new Set())).toEqual({
      totalLessons: 0,
      completedLessons: 0,
      resumeLessonId: null,
    });
  });

  it("ignores a completed lesson that is no longer in the course", () => {
    expect(summarizeProgress([10], new Set([10, 99])).completedLessons).toBe(1);
  });
});
