import { execSync } from "node:child_process";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as argon2 from "argon2";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service.js";

const EMAIL = "eleve@test.local";
const PASSWORD = "bonmotdepasse";
const NOT_ACTIVATED_EMAIL = "invite@test.local";

describe("POST /api/auth/login et /api/auth/logout (vraie base PostgreSQL)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;

  // Crée une API neuve. Appelée avant chaque test pour que le compteur du throttler
  // (5 tentatives de login par minute) reparte de zéro : sinon les tests se bloqueraient entre eux.
  async function createApp() {
    // Import dynamique : AuthModule lit process.env.JWT_SECRET au chargement du fichier,
    // il faut donc que la variable soit définie (dans beforeAll) avant d'importer AppModule.
    const { AppModule } = await import("../src/app.module.js");
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const nestApp = module.createNestApplication();
    // Même configuration que main.ts (préfixe /api et validation des DTO).
    nestApp.setGlobalPrefix("api");
    nestApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await nestApp.init();
    return nestApp;
  }

  // Raccourci : envoie `body` en JSON sur la route de login.
  const login = (body: object) => request(app.getHttpServer()).post("/api/auth/login").send(body);

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    process.env.JWT_SECRET = "secret-de-test";
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    // Deux comptes : un activé avec mot de passe, un invité qui n'a pas encore choisi le sien.
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

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(async () => {
    await database?.stop();
  });

  it("connecte l'utilisateur et pose un cookie httpOnly valable 7 jours", async () => {
    const res = await login({ email: EMAIL, password: PASSWORD }).expect(200, {
      message: "Connecté",
    });

    const cookie = res.get("Set-Cookie")?.[0] ?? "";
    expect(cookie).toMatch(/^access_token=/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=604800"); // 7 * 24 * 60 * 60 secondes

    // Le cookie contient un vrai JWT, signé par l'API, avec l'id, l'e-mail et le rôle.
    const token = cookie.split(";")[0].replace("access_token=", "");
    const payload = await app.get(JwtService).verifyAsync(token);
    expect(payload).toMatchObject({ email: EMAIL, role: "student" });
    expect(payload.sub).toEqual(expect.any(Number));
  });

  it("refuse un mauvais mot de passe", async () => {
    const res = await login({ email: EMAIL, password: "mauvais" }).expect(401);
    expect(res.body.message).toBe("Email ou mot de passe incorrect");
    expect(res.get("Set-Cookie")).toBeUndefined();
  });

  it("refuse un e-mail inconnu avec le même message (on ne révèle pas quels comptes existent)", async () => {
    const res = await login({ email: "inconnu@test.local", password: PASSWORD }).expect(401);
    expect(res.body.message).toBe("Email ou mot de passe incorrect");
  });

  it("refuse un compte pas encore activé (passwordHash vide)", async () => {
    await login({ email: NOT_ACTIVATED_EMAIL, password: "nimportequoi" }).expect(401);
  });

  it("refuse un corps de requête invalide", async () => {
    await login({ email: "pas-un-email", password: PASSWORD }).expect(400);
    await login({ email: EMAIL }).expect(400); // mot de passe manquant
    await login({ email: EMAIL, password: PASSWORD, role: "admin" }).expect(400); // champ en trop
  });

  it("bloque après 5 tentatives de connexion en une minute", async () => {
    for (let i = 0; i < 5; i++) {
      await login({ email: EMAIL, password: "mauvais" }).expect(401);
    }
    // 6e tentative : bloquée même avec le bon mot de passe.
    await login({ email: EMAIL, password: PASSWORD }).expect(429);
  });

  it("déconnecte en vidant le cookie", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .expect(200, { message: "Déconnecté" });

    const cookie = res.get("Set-Cookie")?.[0] ?? "";
    expect(cookie).toMatch(/^access_token=;/); // valeur vide
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970"); // date passée : le navigateur le supprime
  });
});
