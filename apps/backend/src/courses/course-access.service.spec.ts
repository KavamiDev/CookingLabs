import { ForbiddenException } from "@nestjs/common";
import type { JwtPayload } from "../auth/auth.guard.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { CourseAccessService } from "./course-access.service.js";

describe("CourseAccessService", () => {
  // Fake Prisma: only course.count is used
  const prismaMock = { course: { count: vi.fn() } };
  const service = new CourseAccessService(prismaMock as unknown as PrismaService);

  const admin: JwtPayload = { sub: 1, email: "admin@test.local", role: "admin" };
  const student: JwtPayload = { sub: 2, email: "eleve@test.local", role: "student" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gives an admin every course", () => {
    expect(service.readableCourses(admin)).toEqual({});
  });

  it("gives a student the courses linked to one of their groups", () => {
    expect(service.readableCourses(student)).toEqual({
      groups: { some: { group: { members: { some: { userId: 2 } } } } },
    });
  });

  it("lets an admin read any course without asking the database", async () => {
    await expect(service.checkCanRead(admin, 1)).resolves.toBeUndefined();
    expect(prismaMock.course.count).not.toHaveBeenCalled();
  });

  it("lets a student read a course open to one of their groups", async () => {
    prismaMock.course.count.mockResolvedValue(1);

    await expect(service.checkCanRead(student, 1)).resolves.toBeUndefined();
    expect(prismaMock.course.count).toHaveBeenCalledWith({
      where: { id: 1, groups: { some: { group: { members: { some: { userId: 2 } } } } } },
    });
  });

  it("refuses with 403 a course that is not open to the student's groups", async () => {
    prismaMock.course.count.mockResolvedValue(0);

    await expect(service.checkCanRead(student, 1)).rejects.toThrow(ForbiddenException);
  });
});
