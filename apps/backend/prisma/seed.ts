import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { PrismaClient } from "../src/generated/prisma/client.js";

// Test account for local login
const TEST_EMAIL = "test@cookinglabs.local";
const TEST_PASSWORD = "azerty974";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const passwordHash = await argon2.hash(TEST_PASSWORD);

  await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: { passwordHash },
    create: {
      email: TEST_EMAIL,
      firstName: "Test",
      lastName: "Cooking test",
      passwordHash,
      activatedAt: new Date(),
    },
  });

  console.log("Profil de test créé");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
