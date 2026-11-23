import { execSync } from "node:child_process";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PrismaExceptionFilter } from "../src/prisma/prisma-exception.filter.js";

const PASSWORD = "bonmotdepasse";
const STUDENT_EMAIL = "eleve@test.local";
const ADMIN_EMAIL = "admin@test.local";

describe("Groups open courses to students (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;
  let studentId: number;
  let adminId: number;
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
    nestApp.useGlobalFilters(new PrismaExceptionFilter(nestApp.get(HttpAdapterHost).httpAdapter));
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
    const student = await prisma.user.create({
      data: { email: STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
    });
    studentId = student.id;
    const admin = await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash, activatedAt: new Date(), role: "admin" },
    });
    adminId = admin.id;
    const course = await prisma.course.create({
      data: {
        title: "Tartes",
        lessons: { create: { title: "La pâte", htmlContent: "<p>Farine</p>", position: 1 } },
      },
    });
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

  // Every group route, with a body when it needs one
  const groupRoutes = (id: number) =>
    [
      { method: "get", path: "/api/groups" },
      { method: "post", path: "/api/groups", body: { name: "Promo" } },
      { method: "patch", path: `/api/groups/${id}`, body: { name: "Promo" } },
      { method: "delete", path: `/api/groups/${id}` },
      { method: "put", path: `/api/groups/${id}/students/1` },
      { method: "delete", path: `/api/groups/${id}/students/1` },
      { method: "put", path: `/api/groups/${id}/courses/1` },
      { method: "delete", path: `/api/groups/${id}/courses/1` },
      { method: "get", path: "/api/users/students" },
    ] as const;

  it("rejects a visitor with 401 and a student with 403 on every group route", async () => {
    const visitor = request(app.getHttpServer());
    const student = await loginAs(STUDENT_EMAIL);

    for (const route of groupRoutes(1)) {
      const body = "body" in route ? route.body : {};
      await visitor[route.method](route.path).send(body).expect(401);
      await student[route.method](route.path).send(body).expect(403);
    }
  });

  it("opens a course to a student when the admin adds them to a group", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const student = await loginAs(STUDENT_EMAIL);
    const lessonPath = `/api/courses/${courseId}/lessons`;

    // No group yet: no course
    expect((await student.get("/api/courses").expect(200)).body).toEqual([]);
    await student.get(`/api/courses/${courseId}`).expect(403);

    const group = await admin.post("/api/groups").send({ name: "  Promo 2026  " }).expect(201);
    expect(group.body.name).toBe("Promo 2026"); // trimmed
    const groupId = group.body.id;
    await admin.put(`/api/groups/${groupId}/courses/${courseId}`).expect(204);
    await admin.put(`/api/groups/${groupId}/students/${studentId}`).expect(204);
    await admin.put(`/api/groups/${groupId}/students/${studentId}`).expect(204); // twice: no error

    // Same session as before: the groups are read from the database on each request
    expect((await student.get("/api/courses").expect(200)).body).toHaveLength(1);
    await student.get(`/api/courses/${courseId}`).expect(200);
    const lessons = (await student.get(`/api/courses/${courseId}`)).body.lessons;
    await student.get(`${lessonPath}/${lessons[0].id}`).expect(200);

    const list = await admin.get("/api/groups").expect(200);
    expect(list.body).toEqual([
      {
        id: groupId,
        name: "Promo 2026",
        students: [{ id: studentId, email: STUDENT_EMAIL, firstName: null, lastName: null }],
        courses: [{ id: courseId, title: "Tartes" }],
      },
    ]);

    // Removed from the group: the access stops at the next request, by API and by URL
    await admin.delete(`/api/groups/${groupId}/students/${studentId}`).expect(204);
    await student.get(`/api/courses/${courseId}`).expect(403);
    await student.get(`${lessonPath}/${lessons[0].id}`).expect(403);
    expect((await student.get("/api/courses").expect(200)).body).toEqual([]);

    await admin.delete(`/api/groups/${groupId}`).expect(204);
  });

  it("closes the course when the admin removes it from the group or deletes the group", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const student = await loginAs(STUDENT_EMAIL);

    const groupId = (await admin.post("/api/groups").send({ name: "Promo A" }).expect(201)).body.id;
    await admin.put(`/api/groups/${groupId}/students/${studentId}`).expect(204);
    await admin.put(`/api/groups/${groupId}/courses/${courseId}`).expect(204);
    await student.get(`/api/courses/${courseId}`).expect(200);

    await admin.delete(`/api/groups/${groupId}/courses/${courseId}`).expect(204);
    await student.get(`/api/courses/${courseId}`).expect(403);

    await admin.put(`/api/groups/${groupId}/courses/${courseId}`).expect(204);
    await student.get(`/api/courses/${courseId}`).expect(200);
    await admin.delete(`/api/groups/${groupId}`).expect(204);
    await student.get(`/api/courses/${courseId}`).expect(403);
  });

  it("keeps the access while one of the student's groups still opens the course", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const student = await loginAs(STUDENT_EMAIL);

    const first = (await admin.post("/api/groups").send({ name: "Matin" }).expect(201)).body.id;
    const second = (await admin.post("/api/groups").send({ name: "Soir" }).expect(201)).body.id;
    for (const groupId of [first, second]) {
      await admin.put(`/api/groups/${groupId}/students/${studentId}`).expect(204);
      await admin.put(`/api/groups/${groupId}/courses/${courseId}`).expect(204);
    }
    // Two groups open the same course: it is listed once
    expect((await student.get("/api/courses").expect(200)).body).toHaveLength(1);

    await admin.delete(`/api/groups/${first}/students/${studentId}`).expect(204);
    await student.get(`/api/courses/${courseId}`).expect(200);

    await admin.delete(`/api/groups/${first}`).expect(204);
    await admin.delete(`/api/groups/${second}`).expect(204);
  });

  it("renames a group, and refuses a name that is taken, empty or too long", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const groupId = (await admin.post("/api/groups").send({ name: "Promo B" }).expect(201)).body.id;
    await admin.post("/api/groups").send({ name: "Promo C" }).expect(201);

    const renamed = await admin.patch(`/api/groups/${groupId}`).send({ name: "Promo D" });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toEqual({ id: groupId, name: "Promo D" });

    const taken = await admin.post("/api/groups").send({ name: "Promo C" }).expect(409);
    expect(taken.body.message).toBe("Un groupe porte déjà ce nom");
    await admin.patch(`/api/groups/${groupId}`).send({ name: "Promo C" }).expect(409);

    await admin.post("/api/groups").send({ name: "   " }).expect(400);
    await admin.post("/api/groups").send({}).expect(400);
    await admin
      .post("/api/groups")
      .send({ name: "x".repeat(101) })
      .expect(400);
    await admin.post("/api/groups").send({ name: "Promo", extra: true }).expect(400);
  });

  it("answers 404 for an unknown group, student or course", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const groupId = (await admin.post("/api/groups").send({ name: "Promo E" }).expect(201)).body.id;

    await admin.patch("/api/groups/999999").send({ name: "Inconnu" }).expect(404);
    await admin.delete("/api/groups/999999").expect(404);
    await admin.put(`/api/groups/999999/students/${studentId}`).expect(404);
    await admin.put(`/api/groups/999999/courses/${courseId}`).expect(404);
    await admin.put(`/api/groups/${groupId}/students/999999`).expect(404);
    await admin.put(`/api/groups/${groupId}/courses/999999`).expect(404);
    // An admin is not a student: they cannot be added to a group
    await admin.put(`/api/groups/${groupId}/students/${adminId}`).expect(404);
  });

  it("lists the students for the admin, without sensitive fields", async () => {
    const admin = await loginAs(ADMIN_EMAIL);

    const students = await admin.get("/api/users/students").expect(200);

    // toEqual fails on any extra field, such as passwordHash
    expect(students.body).toEqual([
      { id: studentId, email: STUDENT_EMAIL, firstName: null, lastName: null },
    ]);
  });
});
