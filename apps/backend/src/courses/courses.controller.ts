import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CoursesService } from "./courses.service.js";
import { CreateCourseDto, UpdateCourseDto } from "./dto/courses-dto.js";
import { ReorderLessonsDto } from "./dto/lessons-ids.js";

@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }
  //Todo (A001): Get roles admin
  @Post()
  @HttpCode(201)
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }
  //Todo (A001): Get roles admin
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @Patch(":id/lessons/order")
  reorderLessons(
    @Param("id", ParseIntPipe) id: number,
    @Body() reorderLessonsDto: ReorderLessonsDto,
  ) {
    return this.coursesService.reorderLessons(id, reorderLessonsDto);
  }

  //Todo (A001): Get roles admin
  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.coursesService.delete(id);
  }
}
