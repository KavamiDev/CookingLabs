import { Module } from "@nestjs/common";
import { CourseAccessService } from "./course-access.service.js";
import { CoursesController } from "./courses.controller.js";
import { CoursesService } from "./courses.service.js";

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, CourseAccessService],
  // Exported so that LessonsModule applies the same access rule
  exports: [CourseAccessService],
})
export class CoursesModule {}
