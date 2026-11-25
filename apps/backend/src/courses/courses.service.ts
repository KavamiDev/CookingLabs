import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "../auth/auth.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { CourseAccessService } from "./course-access.service.js";
import { summarizeProgress } from "./course-progress.js";
import { CreateCourseDto, UpdateCourseDto } from "./dto/courses-dto.js";
import { ReorderLessonsDto } from "./dto/lessons-ids.js";

// Business logic for courses: the controller only receives the request and calls this service
@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseAccess: CourseAccessService,
  ) {}

  // Only the courses this user can read (all of them for an admin), each with the user's progress
  async findAllFor(user: JwtPayload) {
    const courses = await this.prisma.course.findMany({
      where: this.courseAccess.readableCourses(user),
      orderBy: { id: "asc" },
      include: { lessons: { select: { id: true }, orderBy: { position: "asc" } } },
    });
    const completedIds = await this.completedLessonIds(user.sub);

    // The lesson ids are only used to compute the progress: they are not returned
    return courses.map(({ lessons, ...course }) => ({
      ...course,
      ...summarizeProgress(
        lessons.map((lesson) => lesson.id),
        completedIds,
      ),
    }));
  }

  // One course, after checking that this user can read it (403 otherwise),
  // with the user's progress and the lessons they completed
  async findOneFor(user: JwtPayload, id: number) {
    await this.courseAccess.checkCanRead(user, id);
    const course = await this.findOne(id);
    const completedIds = await this.completedLessonIds(user.sub);

    return {
      ...course,
      lessons: course.lessons.map((lesson) => ({
        ...lesson,
        completed: completedIds.has(lesson.id),
      })),
      ...summarizeProgress(
        course.lessons.map((lesson) => lesson.id),
        completedIds,
      ),
    };
  }

  // Ids of the lessons this user marked as completed (LessonProgress rows)
  private async completedLessonIds(userId: number): Promise<Set<number>> {
    const rows = await this.prisma.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true },
    });
    return new Set(rows.map((row) => row.lessonId));
  }

  async findOne(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        lessons: {
          select: { id: true, title: true, position: true },
          orderBy: {
            position: "asc",
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException("Course not found");
    }
    return course;
  }

  create(createCourseDto: CreateCourseDto) {
    return this.prisma.course.create({
      data: createCourseDto,
    });
  }

  delete(id: number) {
    return this.prisma.course.delete({
      where: { id },
    });
  }

  update(id: number, updateCourseDto: UpdateCourseDto) {
    return this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
    });
  }

  async reorderLessons(id: number, reorderLessonsDto: ReorderLessonsDto) {
    const course = await this.findOne(id);

    for (const lesson of reorderLessonsDto.lessons) {
      const lessonInCourse = course.lessons.find((courseLesson) => courseLesson.id === lesson.id);
      if (!lessonInCourse) {
        throw new BadRequestException(`Lesson ${lesson.id} is not in this course`);
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        lessons: {
          updateMany: reorderLessonsDto.lessons.map((lesson) => ({
            where: { id: lesson.id },
            data: { position: lesson.position },
          })),
        },
      },
    });
  }
}
