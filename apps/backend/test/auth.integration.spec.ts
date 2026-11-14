import { execSync } from "node:child_process";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service.js";

const EMAIL = "eleve@test.local";
const PASSWORD = "bonmotdepasse";
const NOT_ACTIVATED_EMAIL = "invite@test.local";

describe("POST /api/auth/login, /api/auth/logout and GET /api/auth/me (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;

  // A new API is created before each test so the throttler counter
  // (5 login attempts per minute) starts from zero every time
  async function createApp() {
    // Dynamic import: AuthModule reads process.env.JWT_SECRET when the file is loaded
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

  // Sends a JSON body to the login route
  const login = (body: object) => request(app.getHttpServer()).post("/api/auth/login").send(body);

  // Runs once before all tests:
  // starts PostgreSQL, sets DATABASE_URL and JWT_SECRET,
  // creates the SQL tables with prisma migrate deploy, then creates 2 accounts
  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    process.env.JWT_SECRET = "secret-de-test";
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    const prisma = new PrismaService();
    await prisma.user.createMany({
      data: [
        {
          email: EMAIL,
          passwordHash: await argon2.hash(PASSWORD),
          activatedAt: new Date(),
        },
        { email: NOT_ACTIVATED_EMAIL, passwordHash: null },
      ],
    });
    await prisma.$disconnect();
  });

  // New API before each test
  beforeEach(async () => {
    app = await createApp();
  });

  // Closes the API after each test
  afterEach(async () => {
    await app?.close();
  });

  // Stops the database after all tests
  afterAll(async () => {
    await database?.stop();
  });

  it("logs the user in and sets an httpOnly cookie valid for 7 days", async () => {
    const res = await login({ email: EMAIL, password: PASSWORD }).expect(200, {
      message: "Connecté",
    });

    const cookie = res.get("Set-Cookie")?.[0] ?? "";
    expect(cookie).toMatch(/^access_token=/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=604800"); // 7 * 24 * 60 * 60 seconds

    const token = cookie.split(";")[0].replace("access_token=", "");
    const payload = await app.get(JwtService).verifyAsync(token);
    expect(payload).toMatchObject({ email: EMAIL, role: "student" });
    expect(payload.sub).toEqual(expect.any(Number));
  });

  it("rejects a wrong password", async () => {
    const res = await login({ email: EMAIL, password: "fake_mdp" }).expect(401);
    expect(res.body.message).toBe("Email ou mot de passe incorrect");
    expect(res.get("Set-Cookie")).toBeUndefined();
  });

  it("rejects an unknown email", async () => {
    const res = await login({ email: "inconnu@test.local", password: PASSWORD }).expect(401);
    expect(res.body.message).toBe("Email ou mot de passe incorrect");
  });

  it("rejects an account not activated yet (no password hash)", async () => {
    await login({ email: NOT_ACTIVATED_EMAIL, password: "nimportequoi" }).expect(401);
  });

  it("rejects an invalid request body", async () => {
    await login({ email: "pas-un-email", password: PASSWORD }).expect(400);
    await login({ email: EMAIL }).expect(400); // missing password
    await login({ email: EMAIL, password: PASSWORD, role: "admin" }).expect(400); // extra field
  });

  it("blocks after 5 login attempts in one minute", async () => {
    for (let i = 0; i < 5; i++) {
      await login({ email: EMAIL, password: "mauvais" }).expect(401);
    }
    // 6th attempt: blocked, even with the right password
    await login({ email: EMAIL, password: PASSWORD }).expect(429);
  });

  it("logs out by clearing the cookie", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .expect(200, { message: "Déconnecté" });

    const cookie = res.get("Set-Cookie")?.[0] ?? "";
    expect(cookie).toMatch(/^access_token=;/); // empty value
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970"); // date in the past
  });

  it("GET /me rejects a request without cookie", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  // Forged token: not signed with JWT_SECRET
  it("GET /me rejects a forged token", async () => {
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", "access_token=faux.token.invente")
      .expect(401);
  });

  // An agent keeps cookies between requests, like a browser
  it("GET /me returns the logged-in user, then 401 after logout", async () => {
    const browser = request.agent(app.getHttpServer());
    await browser.post("/api/auth/login").send({ email: EMAIL, password: PASSWORD }).expect(200);

    const res = await browser.get("/api/auth/me").expect(200);
    expect(res.body).toEqual({
      id: expect.any(Number),
      email: EMAIL,
      firstName: null,
      lastName: null,
      role: "student",
    });

    await browser.post("/api/auth/logout").expect(200);
    await browser.get("/api/auth/me").expect(401);
  });
});
