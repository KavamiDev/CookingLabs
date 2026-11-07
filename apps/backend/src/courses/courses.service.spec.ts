import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { CoursesService } from "./courses.service.js";

describe("CoursesService", () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: { course: { findMany: vi.fn() } } },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
