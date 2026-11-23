import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

// Business logic for groups: the controller only receives the request and calls this service
@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // Every group with its students and the courses it opens, sorted by name
  async findAll() {
    const groups = await this.prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          select: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { user: { email: "asc" } },
        },
        courses: {
          select: { course: { select: { id: true, title: true } } },
          orderBy: { course: { title: "asc" } },
        },
      },
    });

    // Flat lists, easier to display: { id, name, students: [...], courses: [...] }
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      students: group.members.map((member) => member.user),
      courses: group.courses.map((access) => access.course),
    }));
  }

  async create(name: string) {
    try {
      return await this.prisma.group.create({ data: { name }, select: { id: true, name: true } });
    } catch (error) {
      throw this.nameTakenOr(error);
    }
  }

  async rename(id: number, name: string) {
    try {
      return await this.prisma.group.update({
        where: { id },
        data: { name },
        select: { id: true, name: true },
      });
    } catch (error) {
      throw this.nameTakenOr(error);
    }
  }

  // The students and course links of the group are deleted with it (onDelete: Cascade)
  async delete(id: number) {
    await this.prisma.group.delete({ where: { id } });
  }

  // Adding a student who is already in the group changes nothing
  async addStudent(groupId: number, userId: number) {
    await this.findGroupOr404(groupId);
    const student = await this.prisma.user.findFirst({
      where: { id: userId, role: "student" },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException("Élève introuvable");
    }

    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    });
  }

  // From the next request, the student no longer reads the courses of this group
  async removeStudent(groupId: number, userId: number) {
    await this.findGroupOr404(groupId);
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId } });
  }

  // Giving access to a course that the group already has changes nothing
  async addCourse(groupId: number, courseId: number) {
    await this.findGroupOr404(groupId);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException("Cours introuvable");
    }

    await this.prisma.courseAccess.upsert({
      where: { courseId_groupId: { courseId, groupId } },
      create: { courseId, groupId },
      update: {},
    });
  }

  async removeCourse(groupId: number, courseId: number) {
    await this.findGroupOr404(groupId);
    await this.prisma.courseAccess.deleteMany({ where: { groupId, courseId } });
  }

  private async findGroupOr404(id: number) {
    const group = await this.prisma.group.findUnique({ where: { id }, select: { id: true } });
    if (!group) {
      throw new NotFoundException("Groupe introuvable");
    }
  }

  // P2002 = unique constraint: another group already has this name.
  // Any other error is returned as is (P2025, unknown group, becomes a 404 in PrismaExceptionFilter).
  private nameTakenOr(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("Un groupe porte déjà ce nom");
    }
    return error;
  }
}
