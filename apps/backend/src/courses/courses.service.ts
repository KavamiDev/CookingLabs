import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateCourseDto } from "./dto/courses-dto.js";

//Services is to create really what I want my app is able to do
@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.course.findMany();
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

  update(id: number, updateCourseDto: Partial<CreateCourseDto>) {
    return this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
    });
  }
}
