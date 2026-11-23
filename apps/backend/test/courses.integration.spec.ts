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

describe("Courses need a login, managing them is admin only (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;
  let courseId: number;
  let closedCourseId: number;

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
    const course = await prisma.course.create({
      data: {
        title: "Cours existant",
        // Created out of order, to check that the API sorts them by position
        lessons: {
          create: [
            { title: "Cuisson", htmlContent: "<p>Contenu 2</p>", position: 2 },
            { title: "Pâte", htmlContent: "<p>Contenu 1</p>", position: 1 },
          ],
        },
      },
    });
    courseId = course.id;

    // The student's group opens the first course only
    const student = await prisma.user.findUniqueOrThrow({ where: { email: STUDENT_EMAIL } });
    await prisma.group.create({
      data: {
        name: "Promo 1",
        members: { create: { userId: student.id } },
        courses: { create: { courseId } },
      },
    });
    const closedCourse = await prisma.course.create({ data: { title: "Cours d'un autre groupe" } });
    closedCourseId = closedCourse.id;
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

  it("rejects a visitor with 401 when reading the courses", async () => {
    const server = request(app.getHttpServer());
    await server.get("/api/courses").expect(401);
    await server.get(`/api/courses/${courseId}`).expect(401);
  });

  it("rejects a forged session cookie with 401", async () => {
    const server = request(app.getHttpServer());
    await server.get(`/api/courses/${courseId}`).set("Cookie", "access_token=forged").expect(401);
  });

  it.each([STUDENT_EMAIL, ADMIN_EMAIL])("lets %s read a course without its HTML", async (email) => {
    const user = await loginAs(email);
    await user.get("/api/courses").expect(200);

    const response = await user.get(`/api/courses/${courseId}`).expect(200);
    // toEqual fails on any extra field, such as htmlContent
    expect(response.body.lessons).toEqual([
      { id: expect.any(Number), title: "Pâte", position: 1 },
      { id: expect.any(Number), title: "Cuisson", position: 2 },
    ]);
  });

  it("lists only the courses of the student's groups, and all of them for an admin", async () => {
    const student = await loginAs(STUDENT_EMAIL);
    const studentList = await student.get("/api/courses").expect(200);
    expect(studentList.body.map((course: { id: number }) => course.id)).toEqual([courseId]);

    const admin = await loginAs(ADMIN_EMAIL);
    const adminList = await admin.get("/api/courses").expect(200);
    expect(adminList.body.map((course: { id: number }) => course.id)).toEqual([
      courseId,
      closedCourseId,
    ]);
  });

  it("refuses with 403 a course outside the student's groups, even an unknown one", async () => {
    const student = await loginAs(STUDENT_EMAIL);
    await student.get(`/api/courses/${closedCourseId}`).expect(403);
    // Same answer for an id that does not exist: the student cannot list the course ids
    await student.get("/api/courses/999999").expect(403);

    const admin = await loginAs(ADMIN_EMAIL);
    await admin.get(`/api/courses/${closedCourseId}`).expect(200);
    await admin.get("/api/courses/999999").expect(404);
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
