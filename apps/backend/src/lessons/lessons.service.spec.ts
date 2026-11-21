import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { LessonsService } from "./lessons.service.js";

describe("LessonsService", () => {
  let service: LessonsService;

  // Fake Prisma: each method is a vi.fn() so the real database is never touched
  const prismaMock = { lesson: { findFirst: vi.fn() } };

  const lesson = {
    id: 2,
    title: "La pâte",
    position: 2,
    htmlContent: "<p>Farine</p><script>alert(1)</script>",
    course: { id: 1, title: "Tartes" },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
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
});
