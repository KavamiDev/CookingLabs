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

describe("POST /api/auth/login et /api/auth/logout (base PostgreSQL)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;

  // Created an API before each test for throttler
  // 5 attemps login per minute
  async function createApp() {
    // Import AuthModule that read process.env.JWT_SECRET while loading the file
    const { AppModule } = await import("../src/app.module.js");
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const nestApp = module.createNestApplication();
    // Same config that main.ts
    nestApp.setGlobalPrefix("api");
    nestApp.use(cookieParser());
    nestApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await nestApp.init();
    return nestApp;
  }

  // Send body in json on the login route
  const login = (body: object) => request(app.getHttpServer()).post("/api/auth/login").send(body);

  // Running 1 time before the test
  // Running PostgreSQL
  // Define DATABASE_URL
  // Create SQL tables with prisma migrate deploy
  // Create 2 accounts
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

  // Close API after each test
  afterEach(async () => {
    await app?.close();
  });

  // Close Database after each test
  afterAll(async () => {
    await database?.stop();
  });

  // Connect user and upload a cookie httpOnly available 7 days
  it("connecte l'utilisateur et pose un cookie httpOnly valable 7 jours", async () => {
    const res = await login({ email: EMAIL, password: PASSWORD }).expect(200, {
      message: "Connecté",
    });

    const cookie = res.get("Set-Cookie")?.[0] ?? "";
    expect(cookie).toMatch(/^access_token=/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=604800"); // 7 * 24 * 60 * 60 secondes

    const token = cookie.split(";")[0].replace("access_token=", "");
    const payload = await app.get(JwtService).verifyAsync(token);
    expect(payload).toMatchObject({ email: EMAIL, role: "student" });
    expect(payload.sub).toEqual(expect.any(Number));
  });

  // Reject a bad password
  it("refuse un mauvais mot de passe", async () => {
    const res = await login({ email: EMAIL, password: "fake_mdp" }).expect(401);
    expect(res.body.message).toBe("Email ou mot de passe incorrect");
    expect(res.get("Set-Cookie")).toBeUndefined();
  });

  // Reject an unknown e-mail
  it("refuse un e-mail inconnu", async () => {
    const res = await login({ email: "inconnu@test.local", password: PASSWORD }).expect(401);
    expect(res.body.message).toBe("Email ou mot de passe incorrect");
  });

  // Reject an account not yet activated
  it("refuse un compte pas encore activé (mot de passe hashé vide)", async () => {
    await login({ email: NOT_ACTIVATED_EMAIL, password: "nimportequoi" }).expect(401);
  });

  // Reject request body with bad data
  it("refuse un corp de rêquete mal renseigné", async () => {
    await login({ email: "pas-un-email", password: PASSWORD }).expect(400);
    await login({ email: EMAIL }).expect(400); // mot de passe manquant
    await login({ email: EMAIL, password: PASSWORD, role: "admin" }).expect(400); // champ en trop
  });

  // Bloqued after 5 attemps
  it("bloque après 5 tentatives de connexion en une minute", async () => {
    for (let i = 0; i < 5; i++) {
      await login({ email: EMAIL, password: "mauvais" }).expect(401);
    }
    // 6e attemps: bloqued same with a good password.
    await login({ email: EMAIL, password: PASSWORD }).expect(429);
  });

  // Deconnect by clearing cookie
  it("déconnection en vidant le cookie", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .expect(200, { message: "Déconnecté" });

    const cookie = res.get("Set-Cookie")?.[0] ?? "";
    expect(cookie).toMatch(/^access_token=;/); // valeur vide
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970"); // date passée
  });

  // GET /me without cookie
  it("GET /me refuse une requête sans cookie", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  // GET /me with a forged token (not signed with JWT_SECRET)
  it("GET /me refuse un token falsifié", async () => {
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", "access_token=faux.token.invente")
      .expect(401);
  });

  // An agent keeps cookies between requests, like a browser
  it("GET /me renvoie l'utilisateur connecté, puis 401 après le logout", async () => {
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
