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

describe("POST /api/courses/:courseId/lessons/import (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;
  let prisma: PrismaService;
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

  function importUrl(id: number | string = courseId) {
    return `/api/courses/${id}/lessons/import`;
  }

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    const passwordHash = await argon2.hash(PASSWORD);
    prisma = new PrismaService();
    await prisma.user.createMany({
      data: [
        { email: STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
        { email: ADMIN_EMAIL, passwordHash, activatedAt: new Date(), role: "admin" },
      ],
    });
  });

  beforeEach(async () => {
    app = await createApp();
    // A new course for each test
    courseId = (await prisma.course.create({ data: { title: "Tartes" } })).id;
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("rejects a visitor with 401", async () => {
    await request(app.getHttpServer()).post(importUrl()).expect(401);
  });

  it("rejects a student with 403", async () => {
    const student = await loginAs(STUDENT_EMAIL);
    await student
      .post(importUrl())
      .field("title", "Piège")
      .attach("file", Buffer.from("<p>x</p>"), "a.html")
      .expect(403);
    expect(await prisma.lesson.count({ where: { courseId } })).toBe(0);
  });

  it("stores the HTML already cleaned", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const html =
      '<p onclick="steal()">Pâte</p><script>steal()</script><a href="javascript:steal()">lien</a>' +
      '<iframe src="https://evil.example"></iframe>' +
      '<iframe src="https://player.vimeo.com/video/76979871"></iframe>';

    const res = await admin
      .post(importUrl())
      .field("title", "  La pâte  ")
      .attach("file", Buffer.from(html), "pâte.html")
      .expect(201);

    expect(res.body).toEqual({ id: expect.any(Number), title: "La pâte", position: 1 });
    // Read directly in the database, without the second cleaning done by GET
    const saved = await prisma.lesson.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(saved.htmlContent).toBe(
      '<p>Pâte</p><a>lien</a><iframe src="https://player.vimeo.com/video/76979871"></iframe>',
    );
  });

  it("gives different positions to imports sent at the same time", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        admin
          .post(importUrl())
          .field("title", `Leçon ${n}`)
          .attach("file", Buffer.from("<p>x</p>"), "a.html")
          .expect(201),
      ),
    );

    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      orderBy: { position: "asc" },
    });
    expect(lessons.map((lesson) => lesson.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it("accepts 1 MB and rejects more with 413", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin
      .post(importUrl())
      .field("title", "Limite")
      .attach("file", Buffer.alloc(ONE_MB, "a"), "a.html")
      .expect(201);
    await admin
      .post(importUrl())
      .field("title", "Trop gros")
      .attach("file", Buffer.alloc(ONE_MB + 1, "a"), "a.html")
      .expect(413);
  });

  it.each([
    ["a file that is not .html", "Titre", "a.pdf", Buffer.from("<p>x</p>")],
    ["a file that is not in UTF-8", "Titre", "a.html", Buffer.from("Pâte", "latin1")],
    ["a binary file", "Titre", "a.html", Buffer.from("a\0b")],
    ["an empty file", "Titre", "a.html", Buffer.from("")],
    ["only a script", "Titre", "a.html", Buffer.from("<script>x()</script>")],
    ["an empty title", "   ", "a.html", Buffer.from("<p>x</p>")],
    ["a title too long", "x".repeat(201), "a.html", Buffer.from("<p>x</p>")],
  ])("rejects %s with 400", async (_case, title, name, content) => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin.post(importUrl()).field("title", title).attach("file", content, name).expect(400);
  });

  it("rejects a request without a file with 400", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin.post(importUrl()).field("title", "Titre").expect(400);
    await admin.post(importUrl()).send({ title: "Titre" }).expect(400);
    await admin.post(importUrl()).expect(400);
  });

  it("returns 404 for an unknown course", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin
      .post(importUrl(999999))
      .field("title", "Titre")
      .attach("file", Buffer.from("<p>x</p>"), "a.html")
      .expect(404);
  });
});
