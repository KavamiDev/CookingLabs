import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { getFrontendUrl } from "../config/env.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiryDate,
  isInviteExpired,
} from "./invite-token.js";
import { MailService } from "./mail.service.js";

// Same message for an unknown token and a token already used:
// once used, the token is deleted, so the two cases cannot be told apart
const INVALID_LINK =
  "Ce lien d'invitation n'est plus valable : il a déjà été utilisé ou est incorrect.";
const EXPIRED_LINK = "Ce lien d'invitation a expiré. Demandez-en un nouveau à votre école.";

// Invitation of a student: a link by e-mail, then the student chooses a password
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // Creates a new link for an account not activated yet and sends it by e-mail.
  // A new link replaces the previous one (only the last hash is saved).
  async invite(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    if (user.activatedAt) {
      throw new ConflictException("Ce compte est déjà activé");
    }

    const { token, tokenHash } = generateInviteToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { inviteToken: tokenHash, inviteExpiresAt: inviteExpiryDate() },
    });

    // encodeURIComponent: the token is already safe in a URL, but it costs nothing to be sure
    const link = `${getFrontendUrl()}/activation?token=${encodeURIComponent(token)}`;
    await this.mail.sendInvitation(user.email, link);
  }

  // The student opens the link and chooses a password: the account is activated.
  async activate(token: string, password: string): Promise<void> {
    const tokenHash = hashInviteToken(token);
    const user = await this.prisma.user.findUnique({ where: { inviteToken: tokenHash } });
    if (!user) {
      throw new BadRequestException(INVALID_LINK);
    }
    if (isInviteExpired(user.inviteExpiresAt)) {
      throw new BadRequestException(EXPIRED_LINK);
    }

    const passwordHash = await argon2.hash(password);

    // Single use: the update only matches while the token is still saved.
    // If two requests use the same link at the same time, only one finds it (count = 1).
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.id, inviteToken: tokenHash },
      data: { passwordHash, activatedAt: new Date(), inviteToken: null, inviteExpiresAt: null },
    });
    if (count === 0) {
      throw new BadRequestException(INVALID_LINK);
    }
  }
}
