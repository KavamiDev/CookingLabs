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
const ONE_MB = 1024 * 1024;

// A valid quiz file with 2 questions
function quizFile(title = "Les pâtes") {
  const quiz = {
    title,
    passThreshold: 80,
    questions: [
      {
        text: "Quelle farine pour une pâte brisée ?",
        type: "single",
        choices: [
          { text: "T55", isCorrect: true },
          { text: "T150", isCorrect: false },
        ],
      },
      {
        text: "Quels ingrédients dans une pâte sucrée ?",
        type: "multiple",
        choices: [
          { text: "Sucre", isCorrect: true },
          { text: "Beurre", isCorrect: true },
          { text: "Levure", isCorrect: false },
        ],
      },
    ],
  };
  return Buffer.from(JSON.stringify(quiz));
}

describe("Quiz import and admin preview (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;
  let prisma: PrismaService;
  let courseId: number;
  let lessonId: number;
  let studentId: number;

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

  function quizUrl(course: number = courseId, lesson: number = lessonId) {
    return `/api/courses/${course}/lessons/${lesson}/quiz`;
  }

  // Number of rows of each quiz table: proves that a refused import saved nothing
  async function countRows() {
    return {
      quizzes: await prisma.quiz.count(),
      questions: await prisma.question.count(),
      choices: await prisma.choice.count(),
    };
  }

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    const passwordHash = await argon2.hash(PASSWORD);
    prisma = new PrismaService();
    studentId = (
      await prisma.user.create({
        data: { email: STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
      })
    ).id;
    await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash, activatedAt: new Date(), role: "admin" },
    });
  });

  beforeEach(async () => {
    app = await createApp();
    // A new course with one lesson for each test
    const course = await prisma.course.create({
      data: {
        title: "Tartes",
        lessons: { create: { title: "Pâte", htmlContent: "<p>x</p>", position: 1 } },
      },
      include: { lessons: true },
    });
    courseId = course.id;
    lessonId = course.lessons[0].id;
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("rejects a visitor with 401 and a student with 403", async () => {
    await request(app.getHttpServer()).post(`${quizUrl()}/import`).expect(401);
    await request(app.getHttpServer()).get(quizUrl()).expect(401);

    const student = await loginAs(STUDENT_EMAIL);
    await student.post(`${quizUrl()}/import`).attach("file", quizFile(), "qcm.json").expect(403);
    await student.get(quizUrl()).expect(403);
    expect(await prisma.quiz.count({ where: { lessonId } })).toBe(0);
  });

  it("saves the quiz in file order and shows it to the admin with the right answers", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const imported = await admin
      .post(`${quizUrl()}/import`)
      .attach("file", quizFile(), "qcm.json")
      .expect(201);

    const preview = await admin.get(quizUrl()).expect(200);
    expect(preview.body).toEqual(imported.body);
    expect(preview.body).toMatchObject({
      title: "Les pâtes",
      passThreshold: 80,
      questions: [
        {
          text: "Quelle farine pour une pâte brisée ?",
          type: "single",
          position: 1,
          choices: [
            { text: "T55", isCorrect: true },
            { text: "T150", isCorrect: false },
          ],
        },
        {
          type: "multiple",
          position: 2,
          choices: [
            { text: "Sucre", isCorrect: true },
            { text: "Beurre", isCorrect: true },
            { text: "Levure", isCorrect: false },
          ],
        },
      ],
    });
  });

  it("returns 404 when the lesson has no quiz yet", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin.get(quizUrl()).expect(404);
  });

  it("returns 404 for a lesson of another course, and saves nothing", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const otherCourse = await prisma.course.create({ data: { title: "Autre" } });
    const before = await countRows();

    await admin
      .post(`${quizUrl(otherCourse.id)}/import`)
      .attach("file", quizFile(), "qcm.json")
      .expect(404);
    await admin
      .post(`${quizUrl(courseId, 999999)}/import`)
      .attach("file", quizFile(), "qcm.json")
      .expect(404);
    await admin.get(quizUrl(otherCourse.id)).expect(404);
    expect(await countRows()).toEqual(before);
  });

  it("explains every error with the question number, and keeps the previous quiz", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin.post(`${quizUrl()}/import`).attach("file", quizFile(), "qcm.json").expect(201);
    const before = await countRows();

    const broken = {
      questions: [
        { text: "Bonne question", type: "single", choices: [{ text: "A", isCorrect: true }] },
        { text: "", type: "multiple", choices: [{ text: "A" }, { text: "B" }] },
      ],
    };
    const response = await admin
      .post(`${quizUrl()}/import`)
      .attach("file", Buffer.from(JSON.stringify(broken)), "qcm.json")
      .expect(400);

    expect(response.body.message).toEqual([
      "Question 1 : il faut au moins 2 choix",
      "Question 2 : le texte est obligatoire (1000 caractères maximum)",
      'Question 2 : au moins une bonne réponse attendue pour le type "multiple"',
    ]);
    expect(await countRows()).toEqual(before);
    const kept = await admin.get(quizUrl()).expect(200);
    expect(kept.body.title).toBe("Les pâtes");
  });

  it("replaces a quiz nobody answered, without leaving the old questions", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin.post(`${quizUrl()}/import`).attach("file", quizFile(), "qcm.json").expect(201);
    await admin
      .post(`${quizUrl()}/import`)
      .attach("file", quizFile("Nouvelle version"), "qcm.json")
      .expect(201);

    const quizzes = await prisma.quiz.findMany({ where: { lessonId } });
    expect(quizzes.map((quiz) => quiz.title)).toEqual(["Nouvelle version"]);
    expect(await prisma.question.count({ where: { quiz: { lessonId } } })).toBe(2);
  });

  it("refuses with 409 to replace a quiz students already answered", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const imported = await admin
      .post(`${quizUrl()}/import`)
      .attach("file", quizFile(), "qcm.json")
      .expect(201);
    await prisma.quizAttempt.create({
      data: { quizId: imported.body.id, userId: studentId, score: 50, passed: false },
    });

    const response = await admin
      .post(`${quizUrl()}/import`)
      .attach("file", quizFile("Nouvelle version"), "qcm.json")
      .expect(409);

    expect(response.body.message).toContain("Des élèves ont déjà répondu");
    // The attempt and the quiz it belongs to are kept
    const quiz = await prisma.quiz.findUniqueOrThrow({ where: { lessonId } });
    expect(quiz.title).toBe("Les pâtes");
    expect(await prisma.quizAttempt.count({ where: { quizId: quiz.id } })).toBe(1);
  });

  it("creates a single quiz when two imports are sent at the same time", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const responses = await Promise.all(
      ["Version A", "Version B"].map((title) =>
        admin.post(`${quizUrl()}/import`).attach("file", quizFile(title), "qcm.json"),
      ),
    );

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(await prisma.quiz.count({ where: { lessonId } })).toBe(1);
    expect(await prisma.question.count({ where: { quiz: { lessonId } } })).toBe(2);
  });

  it("rejects a file of more than 1 MB with 413", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin
      .post(`${quizUrl()}/import`)
      .attach("file", Buffer.alloc(ONE_MB + 1, " "), "qcm.json")
      .expect(413);
  });

  it.each([
    ["no file", null, ""],
    ["a file that is not .json", quizFile(), "qcm.txt"],
    ["invalid JSON", Buffer.from("{ questions: [] "), "qcm.json"],
    ["a file that is not in UTF-8", Buffer.from('{"title":"Pâte"}', "latin1"), "qcm.json"],
    ["an empty quiz", Buffer.from('{"questions":[]}'), "qcm.json"],
  ])("rejects %s with 400", async (_case, content, name) => {
    const admin = await loginAs(ADMIN_EMAIL);
    const before = await countRows();
    const call = admin.post(`${quizUrl()}/import`);
    await (content ? call.attach("file", content, name) : call).expect(400);
    expect(await countRows()).toEqual(before);
  });

  it("rejects a text field next to the file with 400", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin
      .post(`${quizUrl()}/import`)
      .field("title", "Inattendu")
      .attach("file", quizFile(), "qcm.json")
      .expect(400);
  });
});
