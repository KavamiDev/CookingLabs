import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { LessonsService } from "./lessons.service.js";

describe("LessonsService", () => {
  let service: LessonsService;

  // Fake Prisma: each method is a vi.fn() so the real database is never touched
  const prismaMock = {
    lesson: { findFirst: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [LessonsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get<LessonsService>(LessonsService);
  });

  it("returns the lesson with cleaned HTML and the previous / next lessons", async () => {
    prismaMock.lesson.findFirst
      .mockResolvedValueOnce(lesson) // the lesson
      .mockResolvedValueOnce({ id: 1, title: "Introduction" }) // previous
      .mockResolvedValueOnce({ id: 3, title: "La cuisson" }); // next

    const result = await service.findOne(1, 2);

    expect(result.htmlContent).toBe("<p>Farine</p>");
    expect(result.previousLesson).toEqual({ id: 1, title: "Introduction" });
    expect(result.nextLesson).toEqual({ id: 3, title: "La cuisson" });
  });

  it("returns null neighbours for a course with a single lesson", async () => {
    prismaMock.lesson.findFirst
      .mockResolvedValueOnce(lesson)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.findOne(1, 2);

    expect(result.previousLesson).toBeNull();
    expect(result.nextLesson).toBeNull();
  });

  it("throws NotFoundException when the lesson is not in this course", async () => {
    prismaMock.lesson.findFirst.mockResolvedValueOnce(null);

    await expect(service.findOne(99, 2)).rejects.toThrow(NotFoundException);
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
