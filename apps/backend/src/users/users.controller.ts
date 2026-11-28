import { Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../roles_guard/roles.decorator.js";
import { RolesGuard } from "../roles_guard/roles.guard.js";
import { parseStudentsCsv, readCsvFile } from "./read-users-csv.js";
import { UsersService } from "./users.service.js";

// The file is kept in memory while it is read, so its size is limited: a bigger one gets a 413
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

// Admin only, on every route of this controller: 401 for a visitor, 403 for a student
@UseGuards(AuthGuard, RolesGuard)
@Roles(["admin"])
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // The students that can be added to a group
  @Get("students")
  findStudents() {
    return this.usersService.findStudents();
  }

  // Creates students from a .csv file (multipart form, field "file", nothing else).
  // The guards run before the upload is read: a visitor's file is never loaded in memory.
  @Post("import")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0 } }),
  )
  importStudents(@UploadedFile() file?: Express.Multer.File) {
    return this.usersService.importStudents(parseStudentsCsv(readCsvFile(file)));
  }
}
