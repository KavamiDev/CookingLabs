import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { type AuthenticatedRequest, AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../roles_guard/roles.decorator.js";
import { RolesGuard } from "../roles_guard/roles.guard.js";
import { ImportLessonDto } from "./dto/import-lesson.dto.js";
import { LessonsService } from "./lessons.service.js";
import { readHtmlFile } from "./read-html-file.js";

// The file is kept in memory while it is read, so its size is limited: a bigger one gets a 413
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

// Lessons always belong to a course: /api/courses/:courseId/lessons/...
@Controller("courses/:courseId/lessons")
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // Admin only: creates a lesson from a .html file (multipart form: file + title).
  // The guards run before the upload is read: a visitor's file is never loaded in memory.
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  @Post("import")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 1 } }),
  )
  importHtml(
    @Param("courseId", ParseIntPipe) courseId: number,
    @Body() importLessonDto: ImportLessonDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.lessonsService.importHtml(courseId, importLessonDto.title, readHtmlFile(file));
  }

  // Logged-in users who can read the course (see CourseAccessService)
  @UseGuards(AuthGuard)
  @Get(":lessonId")
  findOne(
    @Param("courseId", ParseIntPipe) courseId: number,
    @Param("lessonId", ParseIntPipe) lessonId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.lessonsService.findOne(request.user, courseId, lessonId);
  }
}
