import { execSync } from "node:child_process";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import request from "supertest";
import { AppModule } from "../src/app.module.js";

describe("GET /api/health (real database PostgreSQL)", () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17").start();
    process.env.DATABASE_URL = database.getConnectionUri();
    execSync("pnpm exec prisma migrate deploy", { env: process.env, stdio: "ignore" });

    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await database?.stop();
  });

  it("return ok", async () => {
    await request(app.getHttpServer()).get("/api/health").expect(200, { status: "ok" });
  });
});
