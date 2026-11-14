import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateCourseDto, UpdateCourseDto } from "./dto/courses-dto.js";
import { ReorderLessonsDto } from "./dto/lessons-ids.js";

//Services is to create really what I want my app is able to do
@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.course.findMany();
  }

  async findOne(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        lessons: {
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
