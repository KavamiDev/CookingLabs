import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { LessonsService } from "./lessons.service.js";

// Lessons always belong to a course: /api/courses/:courseId/lessons/...
@Controller("courses/:courseId/lessons")
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // Logged-in users only (students and admins)
  @UseGuards(AuthGuard)
  @Get(":lessonId")
  findOne(
    @Param("courseId", ParseIntPipe) courseId: number,
    @Param("lessonId", ParseIntPipe) lessonId: number,
  ) {
    return this.lessonsService.findOne(courseId, lessonId);
  }
}
