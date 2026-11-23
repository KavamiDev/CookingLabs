import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { CoursesController } from "./courses.controller.js";
import { CoursesService } from "./courses.service.js";

describe("CoursesController", () => {
  let controller: CoursesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: { course: { findMany: vi.fn() } } },
        // Needed by AuthGuard on the admin routes
        { provide: JwtService, useValue: new JwtService({ secret: "secret-de-test" }) },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
