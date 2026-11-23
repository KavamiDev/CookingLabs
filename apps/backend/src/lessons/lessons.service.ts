import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "../auth/auth.guard.js";
import { CourseAccessService } from "../courses/course-access.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { sanitizeLessonHtml } from "./sanitize-lesson-html.js";

// Business logic for lessons: the controller only receives the request and calls this service
@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseAccess: CourseAccessService,
  ) {}

  // Saves the cleaned HTML as the last lesson of the course
  async importHtml(courseId: number, title: string, html: string) {
    const htmlContent = sanitizeLessonHtml(html).trim();
    if (htmlContent === "") {
      throw new BadRequestException("Le fichier est vide après nettoyage");
    }

    return this.prisma.$transaction(async (tx) => {
      // FOR UPDATE locks the course: two imports at the same time cannot get the same position
      const courses = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM courses WHERE id = ${courseId} FOR UPDATE`;
      if (courses.length === 0) {
        throw new NotFoundException("Cours introuvable");
      }

      const lastLesson = await tx.lesson.findFirst({
        where: { courseId },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      return tx.lesson.create({
        data: { courseId, title, htmlContent, position: (lastLesson?.position ?? 0) + 1 },
        select: { id: true, title: true, position: true },
      });
    });
  }

  // One lesson of a course, with its cleaned HTML and the previous / next lessons for navigation.
  // Same access rule as the course: 403 for a student when the course is not open to their groups.
  async findOne(user: JwtPayload, courseId: number, lessonId: number) {
    await this.courseAccess.checkCanRead(user, courseId);

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
