import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma, User } from "../generated/prisma/client.js";
import { InvitationsService } from "../invitations/invitations.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ImportedStudent } from "./read-users-csv.js";

// What the admin sees after an import
export type ImportReport = {
  created: number;
  // Groups that did not exist yet
  groupsCreated: string[];
  // Accounts created, but whose e-mail could not be sent (the admin can send it again)
  invitationFailures: string[];
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService,
  ) {}

  /** Cherche un utilisateur par un champ unique (id ou email). Utilisé par le login. */
  async user(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return this.prisma.user.findUnique({ where });
  }

  // Every student, without sensitive fields (no passwordHash, no inviteToken)
  findStudents() {
    return this.prisma.user.findMany({
      where: { role: "student" },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: { email: "asc" },
    });
  }

  // Creates the students of a CSV file (already checked by parseStudentsCsv), adds them to their
  // groups (created when missing), then sends each one an invitation.
  // All or nothing: if one line is refused, no account is created.
  async importStudents(students: ImportedStudent[]): Promise<ImportReport> {
    // No duplicate e-mail: an address that already has an account is an error on its line
    const existing = await this.prisma.user.findMany({
      where: { email: { in: students.map((student) => student.email) } },
      select: { email: true },
    });
    if (existing.length > 0) {
      const taken = new Set(existing.map((user) => user.email));
      throw new BadRequestException(
        students
          .filter((student) => taken.has(student.email))
          .map(
            (student) =>
              `Ligne ${student.line} : un compte existe déjà avec l'e-mail ${student.email}`,
          ),
      );
    }

    // Transaction: the groups, the accounts and the memberships are saved together, or not at all.
    // If another import creates the same e-mail at the same time, the unique constraint makes
    // this one fail (409) and nothing is kept.
    const { users, groupsCreated } = await this.prisma.$transaction(async (tx) => {
      const groupNames = [...new Set(students.map((student) => student.group))];
      const knownGroups = await tx.group.findMany({
        where: { name: { in: groupNames } },
        select: { name: true },
      });
      const known = new Set(knownGroups.map((group) => group.name));
      const missing = groupNames.filter((name) => !known.has(name));
      // skipDuplicates: a group created at the same moment by someone else is simply reused
      await tx.group.createMany({ data: missing.map((name) => ({ name })), skipDuplicates: true });
      const groups = await tx.group.findMany({
        where: { name: { in: groupNames } },
        select: { id: true, name: true },
      });
      const groupIdByName = new Map(groups.map((group) => [group.name, group.id]));

      // No password: the account waits for its activation (A004)
      const users = await tx.user.createManyAndReturn({
        data: students.map(({ email, firstName, lastName }) => ({
          email,
          firstName,
          lastName,
          role: "student" as const,
        })),
        select: { id: true, email: true },
      });
      const userIdByEmail = new Map(users.map((user) => [user.email, user.id]));

      await tx.groupMember.createMany({
        data: students.map((student) => ({
          userId: userIdByEmail.get(student.email) as number,
          groupId: groupIdByName.get(student.group) as number,
        })),
      });
      return { users, groupsCreated: missing };
    });

    // After the transaction: an e-mail cannot be "cancelled", so it is only sent once the
    // accounts really exist. One failed e-mail does not stop the others.
    const invitationFailures: string[] = [];
    for (const user of users) {
      try {
        await this.invitations.invite(user.id);
      } catch (error) {
        this.logger.error(`Invitation not sent to ${user.email}: ${error}`);
        invitationFailures.push(user.email);
      }
    }

    return { created: users.length, groupsCreated, invitationFailures };
  }
}
