import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { CoursesService } from "./courses.service.js";

describe("CoursesService", () => {
  let service: CoursesService;

  // Faux Prisma : on remplace chaque fonction par vi.fn() pour ne pas toucher la vraie base
  const prismaMock = {
    course: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    // On remet les faux à zéro avant chaque test
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursesService, { provide: PrismaService, useValue: prismaMock }],
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

    // Rien ne doit être modifié en base
    expect(prismaMock.course.update).not.toHaveBeenCalled();
  });
});
