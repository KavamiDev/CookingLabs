import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { sanitizeLessonHtml } from "./sanitize-lesson-html.js";

// Business logic for lessons: the controller only receives the request and calls this service
@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  // One lesson of a course, with its cleaned HTML and the previous / next lessons for navigation
  async findOne(courseId: number, lessonId: number) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, courseId },
      include: { course: { select: { id: true, title: true } } },
    });
    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    // Previous lesson = the closest one with a smaller position (null for the first lesson)
    const previousLesson = await this.prisma.lesson.findFirst({
      where: { courseId, position: { lt: lesson.position } },
      orderBy: { position: "desc" },
      select: { id: true, title: true },
    });

    // Next lesson = the closest one with a bigger position (null for the last lesson)
    const nextLesson = await this.prisma.lesson.findFirst({
      where: { courseId, position: { gt: lesson.position } },
      orderBy: { position: "asc" },
      select: { id: true, title: true },
    });

    return {
      id: lesson.id,
      title: lesson.title,
      position: lesson.position,
      htmlContent: sanitizeLessonHtml(lesson.htmlContent),
      course: lesson.course,
      previousLesson,
      nextLesson,
    };
  }
}
