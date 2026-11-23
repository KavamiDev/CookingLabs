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

describe("GET /api/courses/:courseId/lessons/:lessonId (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;
  let courseId: number;
  let otherCourseId: number;
  let closedCourseId: number;
  let closedLessonId: number;
  let lessonIds: number[];

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

  async function loginAsStudent() {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/api/auth/login")
      .send({ email: STUDENT_EMAIL, password: PASSWORD })
      .expect(200);
    return agent;
  }

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    const prisma = new PrismaService();
    const student = await prisma.user.create({
      data: {
        email: STUDENT_EMAIL,
        passwordHash: await argon2.hash(PASSWORD),
        activatedAt: new Date(),
      },
    });

    // A course with 3 lessons, the 2nd one contains a script that must be removed
    const course = await prisma.course.create({ data: { title: "Tartes" } });
    courseId = course.id;
    const lessons = [
      { title: "Introduction", htmlContent: "<p>Bienvenue</p>", position: 1 },
      {
        title: "La pâte",
        htmlContent: "<p>Farine</p><script>alert(1)</script>",
        position: 2,
      },
      { title: "La cuisson", htmlContent: "<p>Four à 180 °C</p>", position: 3 },
    ];
    lessonIds = [];
    for (const lesson of lessons) {
      const created = await prisma.lesson.create({ data: { ...lesson, courseId } });
      lessonIds.push(created.id);
    }

    const otherCourse = await prisma.course.create({ data: { title: "Autre cours" } });
    otherCourseId = otherCourse.id;

    // The student's group opens both courses, not the third one
    await prisma.group.create({
      data: {
        name: "Promo 1",
        members: { create: { userId: student.id } },
        courses: { create: [{ courseId }, { courseId: otherCourseId }] },
      },
    });
    const closedCourse = await prisma.course.create({
      data: {
        title: "Cours fermé",
        lessons: { create: { title: "Secret", htmlContent: "<p>Secret</p>", position: 1 } },
      },
      include: { lessons: true },
    });
    closedCourseId = closedCourse.id;
    closedLessonId = closedCourse.lessons[0].id;
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

  it("rejects a visitor with 401", async () => {
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/lessons/${lessonIds[1]}`)
      .expect(401);
  });

  it("returns the cleaned lesson with the previous and next lessons", async () => {
    const student = await loginAsStudent();

    const res = await student.get(`/api/courses/${courseId}/lessons/${lessonIds[1]}`).expect(200);

    expect(res.body.title).toBe("La pâte");
    expect(res.body.htmlContent).toBe("<p>Farine</p>");
    expect(res.body.course).toEqual({ id: courseId, title: "Tartes" });
    expect(res.body.previousLesson).toEqual({ id: lessonIds[0], title: "Introduction" });
    expect(res.body.nextLesson).toEqual({ id: lessonIds[2], title: "La cuisson" });
  });

  it("has no previous lesson on the first one and no next lesson on the last one", async () => {
    const student = await loginAsStudent();

    const first = await student.get(`/api/courses/${courseId}/lessons/${lessonIds[0]}`);
    expect(first.body.previousLesson).toBeNull();

    const last = await student.get(`/api/courses/${courseId}/lessons/${lessonIds[2]}`);
    expect(last.body.nextLesson).toBeNull();
  });

  it("returns 404 when the lesson belongs to another course", async () => {
    const student = await loginAsStudent();

    await student.get(`/api/courses/${otherCourseId}/lessons/${lessonIds[0]}`).expect(404);
  });

  it("refuses with 403 a lesson of a course outside the student's groups", async () => {
    const student = await loginAsStudent();

    const res = await student.get(`/api/courses/${closedCourseId}/lessons/${closedLessonId}`);
    expect(res.status).toBe(403);
    expect(res.text).not.toContain("Secret");
  });
});
