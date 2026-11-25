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
const OTHER_STUDENT_EMAIL = "autre@test.local";
const ADMIN_EMAIL = "admin@test.local";

describe("A student's progress in a course (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;
  let prisma: PrismaService;
  let courseId: number;
  let emptyCourseId: number;
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

  async function loginAs(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    return agent;
  }

  const progressPath = (lessonId: number) =>
    `/api/courses/${courseId}/lessons/${lessonId}/progress`;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    const passwordHash = await argon2.hash(PASSWORD);
    prisma = new PrismaService();
    const student = await prisma.user.create({
      data: { email: STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
    });
    const otherStudent = await prisma.user.create({
      data: { email: OTHER_STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
    });
    await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash, activatedAt: new Date(), role: "admin" },
    });

    // A course with 5 lessons, and a course without lessons
    const course = await prisma.course.create({ data: { title: "Tartes" } });
    courseId = course.id;
    lessonIds = [];
    for (let position = 1; position <= 5; position++) {
      const lesson = await prisma.lesson.create({
        data: { courseId, title: `Leçon ${position}`, htmlContent: "<p>x</p>", position },
      });
      lessonIds.push(lesson.id);
    }
    const emptyCourse = await prisma.course.create({ data: { title: "Bientôt" } });
    emptyCourseId = emptyCourse.id;

    // Both students are in the group that opens the two courses, not the closed one
    await prisma.group.create({
      data: {
        name: "Promo 1",
        members: { create: [{ userId: student.id }, { userId: otherStudent.id }] },
        courses: { create: [{ courseId }, { courseId: emptyCourseId }] },
      },
    });
    const closedCourse = await prisma.course.create({
      data: {
        title: "Fermé",
        lessons: { create: { title: "Secret", htmlContent: "<p>x</p>", position: 1 } },
      },
      include: { lessons: true },
    });
    closedCourseId = closedCourse.id;
    closedLessonId = closedCourse.lessons[0].id;
  });

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("rejects a visitor with 401 and an admin with 403", async () => {
    await request(app.getHttpServer()).put(progressPath(lessonIds[0])).expect(401);
    const admin = await loginAs(ADMIN_EMAIL);
    await admin.put(progressPath(lessonIds[0])).expect(403);
  });

  it("starts at 0 %, and a course without lessons stays at 0 % without error", async () => {
    const student = await loginAs(OTHER_STUDENT_EMAIL);

    const list = await student.get("/api/courses").expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        id: courseId,
        totalLessons: 5,
        completedLessons: 0,
        resumeLessonId: lessonIds[0],
      }),
      expect.objectContaining({
        id: emptyCourseId,
        totalLessons: 0,
        completedLessons: 0,
        resumeLessonId: null,
      }),
    ]);
    const empty = await student.get(`/api/courses/${emptyCourseId}`).expect(200);
    expect(empty.body).toMatchObject({ lessons: [], totalLessons: 0, completedLessons: 0 });
  });

  it("counts 2 lessons out of 5, once each, and keeps them after a new login", async () => {
    const student = await loginAs(STUDENT_EMAIL);

    // A double click: the same lesson twice at the same time
    const [first, second] = await Promise.all([
      student.put(progressPath(lessonIds[0])),
      student.put(progressPath(lessonIds[0])),
    ]);
    expect([first.status, second.status]).toEqual([204, 204]);
    await student.put(progressPath(lessonIds[2])).expect(204);
    expect(await prisma.lessonProgress.count()).toBe(2);

    // New session: the progress is in the database, not in the session
    const again = await loginAs(STUDENT_EMAIL);
    const course = await again.get(`/api/courses/${courseId}`).expect(200);
    expect(course.body).toMatchObject({
      totalLessons: 5,
      completedLessons: 2,
      // The first lesson not completed, in course order
      resumeLessonId: lessonIds[1],
    });
    expect(course.body.lessons.map((lesson: { completed: boolean }) => lesson.completed)).toEqual([
      true,
      false,
      true,
      false,
      false,
    ]);
    const lesson = await again.get(`/api/courses/${courseId}/lessons/${lessonIds[0]}`);
    expect(lesson.body.completed).toBe(true);
  });

  it("keeps each student's progress apart", async () => {
    const other = await loginAs(OTHER_STUDENT_EMAIL);

    const course = await other.get(`/api/courses/${courseId}`).expect(200);
    expect(course.body.completedLessons).toBe(0);
    const lesson = await other.get(`/api/courses/${courseId}/lessons/${lessonIds[0]}`);
    expect(lesson.body.completed).toBe(false);
  });

  it("refuses a lesson outside the student's groups (403) or of another course (404)", async () => {
    const student = await loginAs(STUDENT_EMAIL);
    const before = await prisma.lessonProgress.count();

    await student
      .put(`/api/courses/${closedCourseId}/lessons/${closedLessonId}/progress`)
      .expect(403);
    // The lesson exists, but not in this course
    await student.put(progressPath(closedLessonId)).expect(404);
    await student.put(progressPath(999999)).expect(404);

    expect(await prisma.lessonProgress.count()).toBe(before);
  });
});
