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
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../roles_guard/roles.decorator.js";
import { RolesGuard } from "../roles_guard/roles.guard.js";
import { GroupNameDto } from "./dto/group-name.dto.js";
import { GroupsService } from "./groups.service.js";

// Admin only, on every route of this controller: 401 for a visitor, 403 for a student
@UseGuards(AuthGuard, RolesGuard)
@Roles(["admin"])
@Controller("groups")
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Post()
  @HttpCode(201)
  create(@Body() groupNameDto: GroupNameDto) {
    return this.groupsService.create(groupNameDto.name);
  }

  @Patch(":id")
  rename(@Param("id", ParseIntPipe) id: number, @Body() groupNameDto: GroupNameDto) {
    return this.groupsService.rename(id, groupNameDto.name);
  }

  @Delete(":id")
  @HttpCode(204)
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.groupsService.delete(id);
  }

  // PUT: adding twice is harmless. 204: nothing to return
  @Put(":id/students/:userId")
  @HttpCode(204)
  addStudent(@Param("id", ParseIntPipe) id: number, @Param("userId", ParseIntPipe) userId: number) {
    return this.groupsService.addStudent(id, userId);
  }

  @Delete(":id/students/:userId")
  @HttpCode(204)
  removeStudent(
    @Param("id", ParseIntPipe) id: number,
    @Param("userId", ParseIntPipe) userId: number,
  ) {
    return this.groupsService.removeStudent(id, userId);
  }

  @Put(":id/courses/:courseId")
  @HttpCode(204)
  addCourse(
    @Param("id", ParseIntPipe) id: number,
    @Param("courseId", ParseIntPipe) courseId: number,
  ) {
    return this.groupsService.addCourse(id, courseId);
  }

  @Delete(":id/courses/:courseId")
  @HttpCode(204)
  removeCourse(
    @Param("id", ParseIntPipe) id: number,
    @Param("courseId", ParseIntPipe) courseId: number,
  ) {
    return this.groupsService.removeCourse(id, courseId);
  }
}
