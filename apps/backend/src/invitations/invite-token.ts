import { createHash, randomBytes } from "node:crypto";

// An invitation link can be used for 7 days
export const INVITE_VALIDITY_DAYS = 7;

// Creates a new invitation token.
// - token: sent to the student in the link, never saved
// - tokenHash: saved in the database (users.inviteToken)
// Someone who reads the database cannot rebuild the link from the hash.
export function generateInviteToken(): { token: string; tokenHash: string } {
  // 32 random bytes from the system's secure generator, written in base64url (safe in a URL)
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

// SHA-256 of the token, in hexadecimal.
// SHA-256 (and not argon2, used for passwords) is fine here: the token is fully random and far
// too long to be guessed. It also always gives the same hash, so the user can be found by it.
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Date when an invitation created at `now` stops working
export function inviteExpiryDate(now: Date = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + INVITE_VALIDITY_DAYS);
  return expiresAt;
}

// True when the invitation can no longer be used at `now` (no date counts as expired)
export function isInviteExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  return expiresAt === null || expiresAt.getTime() <= now.getTime();
}
