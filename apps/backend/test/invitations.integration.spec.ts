import { execSync } from "node:child_process";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { hashInviteToken } from "../src/invitations/invite-token.js";
import { MailService } from "../src/invitations/mail.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PrismaExceptionFilter } from "../src/prisma/prisma-exception.filter.js";

const PASSWORD = "bonmotdepasse";
const NEW_PASSWORD = "mon-nouveau-mot-de-passe";
const ADMIN_EMAIL = "admin@test.local";
const ACTIVE_STUDENT_EMAIL = "eleve@test.local";

describe("Invitations: link by e-mail, then first password (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let app: INestApplication;
  let activeStudentId: number;
  // Links "sent" during the current test (the e-mail is replaced by this list)
  let sentLinks: { to: string; link: string }[];

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

    // Replaces the e-mail sending: keeps the link so the test can open it
    vi.spyOn(nestApp.get(MailService), "sendInvitation").mockImplementation(async (to, link) => {
      sentLinks.push({ to, link });
    });
    return nestApp;
  }

  async function loginAs(email: string, password = PASSWORD) {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/api/auth/login").send({ email, password }).expect(200);
    return agent;
  }

  // A new account waiting for its invitation
  async function createInvitedStudent(email: string) {
    const user = await prisma.user.create({ data: { email } });
    return user.id;
  }

  // The admin sends the invitation, the test reads the token in the "e-mail"
  async function inviteAndGetToken(userId: number) {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin.post("/api/invitations").send({ userId }).expect(204);
    const link = new URL(sentLinks[sentLinks.length - 1].link);
    return link.searchParams.get("token") ?? "";
  }

  const accept = (body: object) =>
    request(app.getHttpServer()).post("/api/invitations/accept").send(body);

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    prisma = new PrismaService();
    const passwordHash = await argon2.hash(PASSWORD);
    await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash, activatedAt: new Date(), role: "admin" },
    });
    const activeStudent = await prisma.user.create({
      data: { email: ACTIVE_STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
    });
    activeStudentId = activeStudent.id;
  });

  beforeEach(async () => {
    sentLinks = [];
    app = await createApp();
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("only lets an admin send an invitation", async () => {
    const userId = await createInvitedStudent("refus@test.local");
    await request(app.getHttpServer()).post("/api/invitations").send({ userId }).expect(401);
    const student = await loginAs(ACTIVE_STUDENT_EMAIL);
    await student.post("/api/invitations").send({ userId }).expect(403);
    expect(sentLinks).toHaveLength(0);
  });

  it("sends a link valid 7 days and only saves the hash of the token", async () => {
    const userId = await createInvitedStudent("nouveau@test.local");
    const token = await inviteAndGetToken(userId);

    expect(sentLinks[0].to).toBe("nouveau@test.local");
    expect(sentLinks[0].link).toBe(
      `http://localhost:3000/activation?token=${encodeURIComponent(token)}`,
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.inviteToken).toBe(hashInviteToken(token));
    expect(user.inviteToken).not.toBe(token);
    const days = ((user.inviteExpiresAt?.getTime() ?? 0) - Date.now()) / (24 * 3600 * 1000);
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("refuses an unknown account, an account already activated and an invalid body", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    await admin.post("/api/invitations").send({ userId: 999_999 }).expect(404);
    const res = await admin.post("/api/invitations").send({ userId: activeStudentId }).expect(409);
    expect(res.body.message).toBe("Ce compte est déjà activé");
    await admin.post("/api/invitations").send({ userId: "abc" }).expect(400);
    expect(sentLinks).toHaveLength(0);
  });

  it("activates the account: the student can log in, and the link no longer works", async () => {
    const email = "active-moi@test.local";
    const userId = await createInvitedStudent(email);
    const token = await inviteAndGetToken(userId);

    // Before the activation, no login possible
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password: NEW_PASSWORD })
      .expect(401);

    await accept({ token, password: NEW_PASSWORD }).expect(200, { message: "Compte activé" });

    await loginAs(email, NEW_PASSWORD);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.activatedAt).not.toBeNull();
    expect(user.inviteToken).toBeNull();
    expect(user.passwordHash).not.toContain(NEW_PASSWORD);

    // Single use
    const res = await accept({ token, password: "un-autre-mot-de-passe" }).expect(400);
    expect(res.body.message).toBe(
      "Ce lien d'invitation n'est plus valable : il a déjà été utilisé ou est incorrect.",
    );
    await loginAs(email, NEW_PASSWORD);
  });

  it("refuses an expired link with a clear message", async () => {
    const userId = await createInvitedStudent("en-retard@test.local");
    const token = await inviteAndGetToken(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { inviteExpiresAt: new Date(Date.now() - 1000) },
    });

    const res = await accept({ token, password: NEW_PASSWORD }).expect(400);
    expect(res.body.message).toBe(
      "Ce lien d'invitation a expiré. Demandez-en un nouveau à votre école.",
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.activatedAt).toBeNull();
    expect(user.passwordHash).toBeNull();
  });

  it("refuses a password shorter than 12 characters and keeps the link usable", async () => {
    const userId = await createInvitedStudent("court@test.local");
    const token = await inviteAndGetToken(userId);

    const res = await accept({ token, password: "11-caracter" }).expect(400);
    expect(res.body.message).toEqual(["Le mot de passe doit contenir au moins 12 caractères"]);
    await accept({ token, password: "12-caractere" }).expect(200);
  });

  it("refuses an unknown token and an invalid body", async () => {
    await accept({ token: "invente", password: NEW_PASSWORD }).expect(400);
    await accept({ token: "", password: NEW_PASSWORD }).expect(400);
    await accept({ password: NEW_PASSWORD }).expect(400);
    await accept({ token: "x", password: NEW_PASSWORD, role: "admin" }).expect(400);
  });

  it("a new invitation replaces the previous link", async () => {
    const userId = await createInvitedStudent("renvoi@test.local");
    const oldToken = await inviteAndGetToken(userId);
    const newToken = await inviteAndGetToken(userId);

    await accept({ token: oldToken, password: NEW_PASSWORD }).expect(400);
    await accept({ token: newToken, password: NEW_PASSWORD }).expect(200);
  });

  it("only one of two simultaneous uses of the same link succeeds", async () => {
    const userId = await createInvitedStudent("double@test.local");
    const token = await inviteAndGetToken(userId);

    const results = await Promise.all([
      accept({ token, password: "premier-mot-de-passe" }),
      accept({ token, password: "second-mot-de-passe" }),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 400]);
  });

  it("blocks after 10 attempts in one minute", async () => {
    for (let i = 0; i < 10; i++) {
      await accept({ token: `faux-${i}`, password: NEW_PASSWORD }).expect(400);
    }
    await accept({ token: "faux", password: NEW_PASSWORD }).expect(429);
  });
});
