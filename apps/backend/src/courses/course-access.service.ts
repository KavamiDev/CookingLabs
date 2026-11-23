import { ForbiddenException, Injectable } from "@nestjs/common";
import type { JwtPayload } from "../auth/auth.guard.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

// The one rule that says who can read a course:
// - an admin reads every course
// - a student reads the courses linked to at least one of their groups
//
// The groups are read from the database on every request (not from the JWT):
// removing a student from a group cuts their access at once.
@Injectable()
export class CourseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  // Prisma filter on the courses this user can read
  readableCourses(user: JwtPayload): Prisma.CourseWhereInput {
    if (user.role === "admin") {
      return {};
    }
    return { groups: { some: { group: { members: { some: { userId: user.sub } } } } } };
  }

  // 403 when the user cannot read this course.
  // A student also gets 403 for a course that does not exist: they cannot guess which ids exist.
  async checkCanRead(user: JwtPayload, courseId: number): Promise<void> {
    if (user.role === "admin") {
      return;
    }
    const readableCount = await this.prisma.course.count({
      where: { id: courseId, ...this.readableCourses(user) },
    });
    if (readableCount === 0) {
      throw new ForbiddenException("Vous n'avez pas accès à ce cours");
    }
  }
}
