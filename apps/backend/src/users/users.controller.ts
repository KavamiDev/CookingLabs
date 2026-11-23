import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../roles_guard/roles.decorator.js";
import { RolesGuard } from "../roles_guard/roles.guard.js";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admin only: the students that can be added to a group
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  @Get("students")
  findStudents() {
    return this.usersService.findStudents();
  }
}
