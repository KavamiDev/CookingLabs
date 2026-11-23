import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("return ok if Database Up", async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) };
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    await expect(module.get(HealthController).check_little()).resolves.toEqual({ status: "ok" });
  });
});
