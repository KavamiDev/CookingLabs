import { execSync } from "node:child_process";
import { Controller, Get, type INestApplication, UseGuards, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AuthGuard } from "../src/auth/auth.guard.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { Roles } from "../src/roles_guard/roles.decorator.js";
import { RolesGuard } from "../src/roles_guard/roles.guard.js";
import { UserModule } from "../src/users/users.module.js";

const PASSWORD = "bonmotdepasse";
const STUDENT_EMAIL = "eleve@test.local";
const ADMIN_EMAIL = "admin@test.local";

@Controller("test-admin")
class TestAdminController {
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  check() {
    return { ok: true };
  }
}

describe("RolesGuard on an admin route (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;

  async function createApp() {
    const { AppModule } = await import("../src/app.module.js");
    const module = await Test.createTestingModule({
      imports: [AppModule, UserModule],
      controllers: [TestAdminController],
    }).compile();
    const nestApp = module.createNestApplication();
    nestApp.setGlobalPrefix("api");
    nestApp.use(cookieParser());
    nestApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await nestApp.init();
    return nestApp;
  }

  async function loginAs(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    return agent;
  }

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    process.env.JWT_SECRET = "secret-de-test";
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    const passwordHash = await argon2.hash(PASSWORD);
    const prisma = new PrismaService();
    await prisma.user.createMany({
      data: [
        { email: STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
        { email: ADMIN_EMAIL, passwordHash, activatedAt: new Date(), role: "admin" },
      ],
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(async () => {
    await database?.stop();
  });

  it("rejects a request without cookie with 401", async () => {
    await request(app.getHttpServer()).get("/api/test-admin").expect(401);
  });

  it("rejects a student with 403", async () => {
    const student = await loginAs(STUDENT_EMAIL);

    const res = await student.get("/api/test-admin").expect(403);
    expect(res.body.message).toBe("Accès refusé : droits insuffisants");
  });

  it("lets an admin through", async () => {
    const admin = await loginAs(ADMIN_EMAIL);

    await admin.get("/api/test-admin").expect(200, { ok: true });
  });
});
