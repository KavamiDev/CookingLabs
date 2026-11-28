import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../roles_guard/roles.decorator.js";
import { RolesGuard } from "../roles_guard/roles.guard.js";
import { QuizzesService } from "./quizzes.service.js";
import { readQuizFile } from "./read-quiz-file.js";
import { validateQuiz } from "./validate-quiz.js";

// The file is kept in memory while it is read, so its size is limited: a bigger one gets a 413
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

// A quiz always belongs to a lesson: /api/courses/:courseId/lessons/:lessonId/quiz
@Controller("courses/:courseId/lessons/:lessonId/quiz")
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // Admin only: creates (or replaces) the quiz of the lesson from a .json file (multipart: file).
  // The guards run before the upload is read: a visitor's file is never loaded in memory.
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  @Post("import")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0 } }),
  )
  importQuiz(
    @Param("courseId", ParseIntPipe) courseId: number,
    @Param("lessonId", ParseIntPipe) lessonId: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const quiz = validateQuiz(readQuizFile(file));
    return this.quizzesService.importQuiz(courseId, lessonId, quiz);
  }

  // Admin only: the quiz with its right answers, to check the import.
  // Students will get their own route, without the right answers.
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  @Get()
  findWithAnswers(
    @Param("courseId", ParseIntPipe) courseId: number,
    @Param("lessonId", ParseIntPipe) lessonId: number,
  ) {
    return this.quizzesService.findWithAnswers(courseId, lessonId);
  }
}
