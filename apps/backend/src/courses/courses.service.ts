import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "../auth/auth.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { CourseAccessService } from "./course-access.service.js";
import { CreateCourseDto, UpdateCourseDto } from "./dto/courses-dto.js";
import { ReorderLessonsDto } from "./dto/lessons-ids.js";

// Business logic for courses: the controller only receives the request and calls this service
@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseAccess: CourseAccessService,
  ) {}

  // Only the courses this user can read (all of them for an admin)
  findAllFor(user: JwtPayload) {
    return this.prisma.course.findMany({
      where: this.courseAccess.readableCourses(user),
      orderBy: { id: "asc" },
    });
  }

  // One course, after checking that this user can read it (403 otherwise)
  async findOneFor(user: JwtPayload, id: number) {
    await this.courseAccess.checkCanRead(user, id);
    return this.findOne(id);
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
