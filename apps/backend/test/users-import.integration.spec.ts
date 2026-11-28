import { execSync } from "node:child_process";
import { type INestApplication, ServiceUnavailableException, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { MailService } from "../src/invitations/mail.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PrismaExceptionFilter } from "../src/prisma/prisma-exception.filter.js";

const PASSWORD = "bonmotdepasse";
const ADMIN_EMAIL = "admin@test.local";
const STUDENT_EMAIL = "eleve@test.local";
const HEADER = "email,first_name,last_name,group";
const EXISTING_GROUP = "CAP 1";

describe("POST /api/users/import: students from a CSV file (real PostgreSQL database)", () => {
  let database: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let app: INestApplication;
  // E-mails "sent" during the current test
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

    // Replaces the e-mail sending: keeps the links so the test can read them
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

  // The admin sends a CSV file made of these lines, and checks the status of the answer
  async function importCsv(lines: string[], expectedStatus: number, name = "eleves.csv") {
    const admin = await loginAs(ADMIN_EMAIL);
    return admin
      .post("/api/users/import")
      .attach("file", Buffer.from(lines.join("\n")), { filename: name, contentType: "text/csv" })
      .expect(expectedStatus);
  }

  const countUsers = () => prisma.user.count();

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    prisma = new PrismaService();
    const passwordHash = await argon2.hash(PASSWORD);
    await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash, activatedAt: new Date(), role: "admin" },
    });
    await prisma.user.create({
      data: { email: STUDENT_EMAIL, passwordHash, activatedAt: new Date() },
    });
    await prisma.group.create({ data: { name: EXISTING_GROUP } });
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

  it("is for admins only", async () => {
    const file = Buffer.from(`${HEADER}\nx@ecole.fr,,,CAP 1`);
    await request(app.getHttpServer())
      .post("/api/users/import")
      .attach("file", file, "eleves.csv")
      .expect(401);
    const student = await loginAs(STUDENT_EMAIL);
    await student.post("/api/users/import").attach("file", file, "eleves.csv").expect(403);
  });

  it("creates the students, their groups when missing, and sends each one an invitation", async () => {
    const res = await importCsv(
      [
        HEADER,
        "Marie@Ecole.fr,Marie,Curie,CAP 1",
        "leo@ecole.fr,Léo,,BTS 2",
        "ines@ecole.fr,,,BTS 2",
      ],
      201,
    );
    expect(res.body).toEqual({ created: 3, groupsCreated: ["BTS 2"], invitationFailures: [] });

    const marie = await prisma.user.findUniqueOrThrow({
      where: { email: "marie@ecole.fr" },
      include: { groups: { include: { group: true } } },
    });
    expect(marie).toMatchObject({ firstName: "Marie", lastName: "Curie", role: "student" });
    // Waiting for its activation: no password, a link valid for 7 days
    expect(marie.passwordHash).toBeNull();
    expect(marie.activatedAt).toBeNull();
    expect(marie.inviteToken).not.toBeNull();
    expect(marie.groups.map((member) => member.group.name)).toEqual([EXISTING_GROUP]);

    // The existing group was reused, the new one created once
    expect(await prisma.group.count({ where: { name: EXISTING_GROUP } })).toBe(1);
    const bts = await prisma.group.findUniqueOrThrow({
      where: { name: "BTS 2" },
      include: { members: true },
    });
    expect(bts.members).toHaveLength(2);

    expect(sentLinks.map((mail) => mail.to).sort()).toEqual([
      "ines@ecole.fr",
      "leo@ecole.fr",
      "marie@ecole.fr",
    ]);
  });

  it("the imported student activates the account with the link and logs in", async () => {
    await importCsv([HEADER, "nina@ecole.fr,Nina,,CAP 1"], 201);
    const token = new URL(sentLinks[0].link).searchParams.get("token");

    await request(app.getHttpServer())
      .post("/api/invitations/accept")
      .send({ token, password: "mon-mot-de-passe" })
      .expect(200);
    // The e-mail typed with capitals still matches
    await loginAs("Nina@Ecole.fr", "mon-mot-de-passe");
  });

  it("refuses the whole file when a line is wrong, with the line numbers", async () => {
    const before = await countUsers();
    const res = await importCsv(
      [HEADER, "valide@ecole.fr,A,B,CAP 1", "pas-un-email,A,B,CAP 1", "sans-groupe@ecole.fr,A,B,"],
      400,
    );
    expect(res.body.message).toEqual([
      "Ligne 3 : l'e-mail « pas-un-email » n'est pas valide",
      "Ligne 4 : le groupe est obligatoire",
    ]);
    expect(await countUsers()).toBe(before);
    expect(sentLinks).toHaveLength(0);
  });

  it("refuses an e-mail that already has an account, and creates nobody", async () => {
    const before = await countUsers();
    const res = await importCsv(
      [
        HEADER,
        "nouveau@ecole.fr,A,B,Groupe jamais créé",
        `${STUDENT_EMAIL.toUpperCase()},A,B,CAP 1`,
      ],
      400,
    );
    expect(res.body.message).toEqual([
      `Ligne 3 : un compte existe déjà avec l'e-mail ${STUDENT_EMAIL}`,
    ]);
    expect(await countUsers()).toBe(before);
    expect(await prisma.group.findUnique({ where: { name: "Groupe jamais créé" } })).toBeNull();
  });

  it("keeps the accounts when an e-mail cannot be sent, and says which one", async () => {
    vi.spyOn(app.get(MailService), "sendInvitation").mockImplementation(async (to, link) => {
      if (to === "panne@ecole.fr") {
        throw new ServiceUnavailableException();
      }
      sentLinks.push({ to, link });
    });

    const res = await importCsv([HEADER, "panne@ecole.fr,,,CAP 1", "recu@ecole.fr,,,CAP 1"], 201);
    expect(res.body).toEqual({
      created: 2,
      groupsCreated: [],
      invitationFailures: ["panne@ecole.fr"],
    });
    expect(sentLinks.map((mail) => mail.to)).toEqual(["recu@ecole.fr"]);
    expect(await prisma.user.findUnique({ where: { email: "panne@ecole.fr" } })).not.toBeNull();
  });

  it("refuses a file that is not a CSV, a missing file, a big file and an extra field", async () => {
    const admin = await loginAs(ADMIN_EMAIL);
    const notCsv = await importCsv([HEADER, "a@ecole.fr,,,CAP 1"], 400, "eleves.xlsx");
    expect(notCsv.body.message).toEqual(["Le fichier doit être au format .csv"]);

    await admin.post("/api/users/import").expect(400);
    await admin
      .post("/api/users/import")
      .attach("file", Buffer.alloc(1024 * 1024 + 1, "a"), "eleves.csv")
      .expect(413);
    await admin
      .post("/api/users/import")
      .field("role", "admin")
      .attach("file", Buffer.from(`${HEADER}\na@ecole.fr,,,CAP 1`), "eleves.csv")
      .expect(400);
  });
});
