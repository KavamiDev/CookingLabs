// API for the Playwright tests (see apps/frontend/playwright.config.ts), with its own database:
// the development database is never used. Testcontainers deletes it when this process stops.
import { execSync, spawn } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

const database = await new PostgreSqlContainer("postgres:17").start();
const env = {
  ...process.env,
  DATABASE_URL: database.getConnectionUri(),
  JWT_SECRET: "secret-de-test",
  PORT: "3001",
  // All the test browsers log in from localhost: the limit of 10 logins per minute would block them
  LOGIN_RATE_LIMIT: "1000",
};

execSync("node_modules/.bin/prisma migrate deploy", { env, stdio: "inherit" });
execSync("node --import tsx prisma/seed.ts", { env, stdio: "inherit" }); // test accounts

const api = spawn("node", ["dist/main.js"], { env, stdio: "inherit" });
api.on("exit", (code) => process.exit(code ?? 1));
