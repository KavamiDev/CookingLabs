import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from "@nestjs/common";
import { CoursesService } from "./courses.service.js";
import { CreateCourseDto } from "./dto/courses-dto.js";

// Create the process of Get / courses
@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Post()
  @HttpCode(201)
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Patch()
  update(@Body("id") id: number, @Body() updateCourseDto: Partial<CreateCourseDto>) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete()
  delete(@Body("id") id: number) {
    return this.coursesService.delete(id);
  }
}
