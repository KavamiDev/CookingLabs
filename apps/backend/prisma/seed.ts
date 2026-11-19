import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { PrismaClient, type UserRole } from "../src/generated/prisma/client.js";

// Local test accounts (never used in production)
const TEST_PASSWORD = "azerty974";
const TEST_ACCOUNTS: { email: string; firstName: string; role: UserRole }[] = [
  { email: "test@cookinglabs.local", firstName: "Élève", role: "student" },
  { email: "admin@cookinglabs.local", firstName: "Admin", role: "admin" },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const passwordHash = await argon2.hash(TEST_PASSWORD);

  // upsert: running the seed twice does not create duplicates
  for (const { email, firstName, role } of TEST_ACCOUNTS) {
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role },
      create: {
        email,
        firstName,
        lastName: "CookingLabs",
        role,
        passwordHash,
        activatedAt: new Date(),
      },
    });
  }

  console.log(`Comptes de test créés (mot de passe : ${TEST_PASSWORD}) :`);
  for (const { email, role } of TEST_ACCOUNTS) {
    console.log(`- ${email} (${role})`);
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
