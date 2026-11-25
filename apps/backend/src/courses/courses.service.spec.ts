import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { JwtPayload } from "../auth/auth.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { CourseAccessService } from "./course-access.service.js";
import { CoursesService } from "./courses.service.js";

describe("CoursesService", () => {
  let service: CoursesService;

  // Fake Prisma: each method is a vi.fn() so the real database is never touched
  const prismaMock = {
    course: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(), // used by CourseAccessService
    },
    lessonProgress: { findMany: vi.fn() },
  };

  const student: JwtPayload = { sub: 2, email: "eleve@test.local", role: "student" };

  beforeEach(async () => {
    // Reset the fakes before each test
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        CourseAccessService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("create doit envoyer les données du cours à Prisma", async () => {
    const newCourse = { title: "Les pâtes", description: "Cuire des pâtes" };
    prismaMock.course.create.mockResolvedValue({ id: 1, ...newCourse });

    const result = await service.create(newCourse);

    expect(prismaMock.course.create).toHaveBeenCalledWith({ data: newCourse });
    expect(result.id).toBe(1);
  });

  it("findOne doit renvoyer le cours s'il existe", async () => {
    prismaMock.course.findUnique.mockResolvedValue({ id: 1, title: "Les pâtes", lessons: [] });

    const result = await service.findOne(1);

    expect(result.title).toBe("Les pâtes");
  });

  it("findOne doit renvoyer une 404 si le cours n'existe pas", async () => {
    prismaMock.course.findUnique.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it("findAllFor ne demande à un élève que les cours de ses groupes, avec sa progression", async () => {
    prismaMock.course.findMany.mockResolvedValue([
      { id: 1, title: "Tartes", lessons: [{ id: 10 }, { id: 11 }, { id: 12 }] },
    ]);
    prismaMock.lessonProgress.findMany.mockResolvedValue([{ lessonId: 10 }]);

    const result = await service.findAllFor(student);

    expect(prismaMock.course.findMany).toHaveBeenCalledWith({
      where: { groups: { some: { group: { members: { some: { userId: 2 } } } } } },
      orderBy: { id: "asc" },
      include: { lessons: { select: { id: true }, orderBy: { position: "asc" } } },
    });
    expect(prismaMock.lessonProgress.findMany).toHaveBeenCalledWith({
      where: { userId: 2 },
      select: { lessonId: true },
    });
    // The lesson ids are not returned, only the progress
    expect(result).toEqual([
      { id: 1, title: "Tartes", totalLessons: 3, completedLessons: 1, resumeLessonId: 11 },
    ]);
  });

  it("findOneFor coche les leçons terminées par l'élève", async () => {
    prismaMock.course.count.mockResolvedValue(1);
    prismaMock.course.findUnique.mockResolvedValue({
      id: 1,
      title: "Tartes",
      lessons: [
        { id: 10, title: "Pâte", position: 1 },
        { id: 11, title: "Cuisson", position: 2 },
      ],
    });
    prismaMock.lessonProgress.findMany.mockResolvedValue([{ lessonId: 10 }]);

    const result = await service.findOneFor(student, 1);

    expect(result.lessons).toEqual([
      { id: 10, title: "Pâte", position: 1, completed: true },
      { id: 11, title: "Cuisson", position: 2, completed: false },
    ]);
    expect(result).toMatchObject({ totalLessons: 2, completedLessons: 1, resumeLessonId: 11 });
  });

  it("findOneFor doit renvoyer une 403 à un élève sans accès, sans lire le cours", async () => {
    prismaMock.course.count.mockResolvedValue(0);

    await expect(service.findOneFor(student, 1)).rejects.toThrow(ForbiddenException);
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });

  it("reorderLessons doit mettre à jour la position des leçons", async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      id: 1,
      lessons: [
        { id: 10, position: 1 },
        { id: 11, position: 2 },
      ],
    });

    await service.reorderLessons(1, {
      lessons: [
        { id: 10, position: 2 },
        { id: 11, position: 1 },
      ],
    });

    expect(prismaMock.course.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        lessons: {
          updateMany: [
            { where: { id: 10 }, data: { position: 2 } },
            { where: { id: 11 }, data: { position: 1 } },
          ],
        },
      },
    });
  });

  it("reorderLessons doit refuser une leçon qui n'est pas dans le cours", async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      id: 1,
      lessons: [{ id: 10, position: 1 }],
    });

    await expect(
      service.reorderLessons(1, { lessons: [{ id: 999, position: 1 }] }),
    ).rejects.toThrow(BadRequestException);

    // Nothing must be written to the database
    expect(prismaMock.course.update).not.toHaveBeenCalled();
  });
});
