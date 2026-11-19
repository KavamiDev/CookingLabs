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
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../roles_guard/roles.decorator.js";
import { RolesGuard } from "../roles_guard/roles.guard.js";
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
  // Admin only: create, update, reorder and delete
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  @Post()
  @HttpCode(201)
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  @Patch(":id/lessons/order")
  reorderLessons(
    @Param("id", ParseIntPipe) id: number,
    @Body() reorderLessonsDto: ReorderLessonsDto,
  ) {
    return this.coursesService.reorderLessons(id, reorderLessonsDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.coursesService.delete(id);
  }
}
