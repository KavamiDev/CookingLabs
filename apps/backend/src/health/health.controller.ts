import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Vérifier que l'API et la base répondent (utilisé par l'hébergeur et la CI) */
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}
