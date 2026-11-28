import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { PrismaClient, type UserRole } from "../src/generated/prisma/client.js";
import { hashInviteToken, inviteExpiryDate } from "../src/invitations/invite-token.js";

// Group of the test student. An admin opens courses to it on the "Groupes" page.
const TEST_GROUP = "Groupe de test";

// Local test accounts (never used in production)
const TEST_STUDENT_EMAIL = "test@cookinglabs.local";
const TEST_PASSWORD = "azerty974";
const TEST_ACCOUNTS: { email: string; firstName: string; role: UserRole }[] = [
  { email: TEST_STUDENT_EMAIL, firstName: "Élève", role: "student" },
  { email: "admin@cookinglabs.local", firstName: "Admin", role: "admin" },
];

// Student invited but not activated yet, with a known link: /activation?token=lien-de-test
// Running the seed again makes the link usable again.
const INVITED_STUDENT_EMAIL = "invite@cookinglabs.local";
const INVITE_TEST_TOKEN = "lien-de-test";

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

  // The test student belongs to the test group (upsert: no duplicate on a second run)
  const group = await prisma.group.upsert({
    where: { name: TEST_GROUP },
    update: {},
    create: { name: TEST_GROUP },
  });
  const student = await prisma.user.findUniqueOrThrow({
    where: { email: TEST_STUDENT_EMAIL },
  });
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: student.id } },
    update: {},
    create: { groupId: group.id, userId: student.id },
  });

  const invitation = {
    passwordHash: null,
    activatedAt: null,
    inviteToken: hashInviteToken(INVITE_TEST_TOKEN),
    inviteExpiresAt: inviteExpiryDate(),
  };
  await prisma.user.upsert({
    where: { email: INVITED_STUDENT_EMAIL },
    update: invitation,
    create: { email: INVITED_STUDENT_EMAIL, firstName: "Invité", ...invitation },
  });

  console.log(`Comptes de test créés (mot de passe : ${TEST_PASSWORD}) :`);
  for (const { email, role } of TEST_ACCOUNTS) {
    console.log(`- ${email} (${role})`);
  }
  console.log(
    `- ${INVITED_STUDENT_EMAIL} (student, à activer) : http://localhost:3000/activation?token=${INVITE_TEST_TOKEN}`,
  );
  console.log(`Groupe « ${TEST_GROUP} » : l'élève de test en fait partie.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
