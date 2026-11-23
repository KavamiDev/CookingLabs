import { Module } from "@nestjs/common";
import { CoursesModule } from "../courses/courses.module.js";
import { LessonsController } from "./lessons.controller.js";
import { LessonsService } from "./lessons.service.js";

@Module({
  // CoursesModule gives CourseAccessService: reading a lesson follows the course access rule
  imports: [CoursesModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
