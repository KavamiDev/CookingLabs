import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiryDate,
  isInviteExpired,
} from "./invite-token.js";

describe("generateInviteToken", () => {
  it("creates a long token safe in a URL, and its hash", () => {
    const { token, tokenHash } = generateInviteToken();
    // 32 bytes in base64url = 43 characters, only letters, digits, - and _
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toBe(hashInviteToken(token));
    expect(tokenHash).not.toContain(token);
  });

  it("creates a different token each time", () => {
    expect(generateInviteToken().token).not.toBe(generateInviteToken().token);
  });
});

describe("hashInviteToken", () => {
  it("always gives the same SHA-256 hash (64 hexadecimal characters) for the same token", () => {
    expect(hashInviteToken("abc")).toBe(hashInviteToken("abc"));
    expect(hashInviteToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken("abc")).not.toBe(hashInviteToken("abd"));
  });
});

describe("inviteExpiryDate and isInviteExpired", () => {
  const createdAt = new Date("2026-11-27T10:00:00Z");

  it("expires 7 days after the creation", () => {
    expect(inviteExpiryDate(createdAt)).toEqual(new Date("2026-12-04T10:00:00Z"));
  });

  it("works until the expiry date, not after", () => {
    const expiresAt = inviteExpiryDate(createdAt);
    expect(isInviteExpired(expiresAt, new Date("2026-12-04T09:59:59Z"))).toBe(false);
    expect(isInviteExpired(expiresAt, new Date("2026-12-04T10:00:00Z"))).toBe(true);
  });

  it("counts a missing date as expired", () => {
    expect(isInviteExpired(null, createdAt)).toBe(true);
  });
});
