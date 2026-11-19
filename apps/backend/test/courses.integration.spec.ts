import { execSync } from "node:child_process";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service.js";

const PASSWORD = "bonmotdepasse";
const STUDENT_EMAIL = "eleve@test.local";
const ADMIN_EMAIL = "admin@test.local";

describe("Course management routes are admin only (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;
  let courseId: number;

  async function createApp() {
    const { AppModule } = await import("../src/app.module.js");
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const nestApp = module.createNestApplication();
    // Same config as main.ts
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
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    const passwordHash = await argon2.hash(PASSWORD);
    const prisma = new PrismaService();
    await prisma.user.createMany({
      data: [
        { email: STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
        { email: ADMIN_EMAIL, passwordHash, activatedAt: new Date(), role: "admin" },
      ],
    });
    const course = await prisma.course.create({ data: { title: "Cours existant" } });
    courseId = course.id;
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

  it("lets a visitor read the courses", async () => {
    await request(app.getHttpServer()).get("/api/courses").expect(200);
  });

  it("rejects a visitor with 401 on every management route", async () => {
    const server = request(app.getHttpServer());
    await server.post("/api/courses").send({ title: "Nouveau" }).expect(401);
    await server.patch(`/api/courses/${courseId}`).send({ title: "Renommé" }).expect(401);
    await server.patch(`/api/courses/${courseId}/lessons/order`).send({ lessons: [] }).expect(401);
    await server.delete(`/api/courses/${courseId}`).expect(401);
  });

  it("rejects a student with 403 on every management route", async () => {
    const student = await loginAs(STUDENT_EMAIL);
    await student.post("/api/courses").send({ title: "Nouveau" }).expect(403);
    await student.patch(`/api/courses/${courseId}`).send({ title: "Renommé" }).expect(403);
    await student.patch(`/api/courses/${courseId}/lessons/order`).send({ lessons: [] }).expect(403);
    await student.delete(`/api/courses/${courseId}`).expect(403);
  });

  it("lets an admin create, rename and delete a course", async () => {
    const admin = await loginAs(ADMIN_EMAIL);

    const created = await admin.post("/api/courses").send({ title: "Nouveau" }).expect(201);
    await admin.patch(`/api/courses/${created.body.id}`).send({ title: "Renommé" }).expect(200);
    await admin.delete(`/api/courses/${created.body.id}`).expect(200);
  });
});
