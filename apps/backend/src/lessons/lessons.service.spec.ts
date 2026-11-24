import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { JwtPayload } from "../auth/auth.guard.js";
import { CourseAccessService } from "../courses/course-access.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { LessonsService } from "./lessons.service.js";

describe("LessonsService", () => {
  let service: LessonsService;

  // Fake Prisma: each method is a vi.fn() so the real database is never touched
  const prismaMock = {
    lesson: { findFirst: vi.fn(), create: vi.fn() },
    course: { count: vi.fn() }, // used by CourseAccessService
    lessonProgress: { findUnique: vi.fn(), createMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };

  const admin: JwtPayload = { sub: 1, email: "admin@test.local", role: "admin" };
  const student: JwtPayload = { sub: 2, email: "eleve@test.local", role: "student" };

  const lesson = {
    id: 2,
    title: "La pâte",
    position: 2,
    htmlContent: "<p>Farine</p><script>alert(1)</script>",
    course: { id: 1, title: "Tartes" },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // A transaction runs its callback with the same fake client
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    // Like Prisma: null when the user has not completed the lesson
    prismaMock.lessonProgress.findUnique.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        CourseAccessService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<LessonsService>(LessonsService);
  });

  it("returns the lesson with cleaned HTML and the previous / next lessons", async () => {
    prismaMock.lesson.findFirst
      .mockResolvedValueOnce(lesson) // the lesson
      .mockResolvedValueOnce({ id: 1, title: "Introduction" }) // previous
      .mockResolvedValueOnce({ id: 3, title: "La cuisson" }); // next

    const result = await service.findOne(admin, 1, 2);

    expect(result.htmlContent).toBe("<p>Farine</p>");
    expect(result.previousLesson).toEqual({ id: 1, title: "Introduction" });
    expect(result.nextLesson).toEqual({ id: 3, title: "La cuisson" });
    expect(result.completed).toBe(false);
  });

  it("tells whether the user already completed the lesson", async () => {
    prismaMock.lesson.findFirst.mockResolvedValueOnce(lesson);
    prismaMock.lessonProgress.findUnique.mockResolvedValue({ lessonId: 2 });

    const result = await service.findOne(admin, 1, 2);

    expect(result.completed).toBe(true);
    expect(prismaMock.lessonProgress.findUnique).toHaveBeenCalledWith({
      where: { userId_lessonId: { userId: 1, lessonId: 2 } },
      select: { lessonId: true },
    });
  });

  it("returns null neighbours for a course with a single lesson", async () => {
    prismaMock.lesson.findFirst
      .mockResolvedValueOnce(lesson)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.findOne(admin, 1, 2);

    expect(result.previousLesson).toBeNull();
    expect(result.nextLesson).toBeNull();
  });

  it("throws NotFoundException when the lesson is not in this course", async () => {
    prismaMock.lesson.findFirst.mockResolvedValueOnce(null);

    await expect(service.findOne(admin, 99, 2)).rejects.toThrow(NotFoundException);
  });

  it("lets a student whose group opens the course read the lesson", async () => {
    prismaMock.course.count.mockResolvedValue(1);
    prismaMock.lesson.findFirst.mockResolvedValueOnce(lesson);

    const result = await service.findOne(student, 1, 2);

    expect(result.title).toBe("La pâte");
  });

  it("refuses with 403 a student whose groups do not open the course", async () => {
    prismaMock.course.count.mockResolvedValue(0);

    await expect(service.findOne(student, 1, 2)).rejects.toThrow(ForbiddenException);
    // The lesson is not even read
    expect(prismaMock.lesson.findFirst).not.toHaveBeenCalled();
  });

  it("markCompleted saves one progress row, and never a duplicate", async () => {
    prismaMock.course.count.mockResolvedValue(1);
    prismaMock.lesson.findFirst.mockResolvedValueOnce({ id: 2 });

    await service.markCompleted(student, 1, 2);

    expect(prismaMock.lessonProgress.createMany).toHaveBeenCalledWith({
      data: { userId: 2, lessonId: 2 },
      skipDuplicates: true,
    });
  });

  it("markCompleted refuses with 403 a course outside the student's groups", async () => {
    prismaMock.course.count.mockResolvedValue(0);

    await expect(service.markCompleted(student, 1, 2)).rejects.toThrow(ForbiddenException);
    expect(prismaMock.lessonProgress.createMany).not.toHaveBeenCalled();
  });

  it("markCompleted refuses with 404 a lesson of another course", async () => {
    prismaMock.course.count.mockResolvedValue(1);
    prismaMock.lesson.findFirst.mockResolvedValueOnce(null);

    await expect(service.markCompleted(student, 1, 2)).rejects.toThrow(NotFoundException);
    expect(prismaMock.lessonProgress.createMany).not.toHaveBeenCalled();
  });

  it("importHtml saves cleaned HTML after the last lesson", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prismaMock.lesson.findFirst.mockResolvedValueOnce({ position: 4 });

    await service.importHtml(1, "La pâte", "<p>Farine</p><script>alert(1)</script>");

    expect(prismaMock.lesson.create.mock.calls[0][0].data).toEqual({
      courseId: 1,
      title: "La pâte",
      htmlContent: "<p>Farine</p>",
      position: 5,
    });
  });

  it("importHtml gives position 1 to the first lesson", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prismaMock.lesson.findFirst.mockResolvedValueOnce(null);

    await service.importHtml(1, "Introduction", "<p>Bienvenue</p>");

    expect(prismaMock.lesson.create.mock.calls[0][0].data.position).toBe(1);
  });

  it("importHtml refuses a file that contains only a script", async () => {
    await expect(service.importHtml(1, "Piège", "<script>alert(1)</script>")).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaMock.lesson.create).not.toHaveBeenCalled();
  });

  it("importHtml refuses an unknown course", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    await expect(service.importHtml(99, "Titre", "<p>x</p>")).rejects.toThrow(NotFoundException);
    expect(prismaMock.lesson.create).not.toHaveBeenCalled();
  });
});
