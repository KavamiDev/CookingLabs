import {
  getFrontendUrl,
  getJwtSecret,
  getLoginRateLimit,
  getMailConfig,
  getTrustProxy,
} from "./env.js";

describe("getJwtSecret", () => {
  it("returns the secret when it is set", () => {
    expect(getJwtSecret({ JWT_SECRET: "secret-de-test" })).toBe("secret-de-test");
  });

  it("throws when the secret is missing or empty", () => {
    expect(() => getJwtSecret({})).toThrow("JWT_SECRET is missing");
    expect(() => getJwtSecret({ JWT_SECRET: "  " })).toThrow("JWT_SECRET is missing");
  });
});

describe("getTrustProxy", () => {
  it("defaults to 0 (no proxy)", () => {
    expect(getTrustProxy({})).toBe(0);
  });

  it("reads the number of proxies", () => {
    expect(getTrustProxy({ TRUST_PROXY: "1" })).toBe(1);
  });

  it("throws on an invalid value", () => {
    expect(() => getTrustProxy({ TRUST_PROXY: "yes" })).toThrow("TRUST_PROXY");
    expect(() => getTrustProxy({ TRUST_PROXY: "-1" })).toThrow("TRUST_PROXY");
  });
});

describe("getFrontendUrl", () => {
  it("defaults to the local website", () => {
    expect(getFrontendUrl({})).toBe("http://localhost:3000");
  });

  it("removes the trailing slash", () => {
    expect(getFrontendUrl({ FRONTEND_URL: "https://cookinglabs.fr/" })).toBe(
      "https://cookinglabs.fr",
    );
  });
});

describe("getMailConfig", () => {
  it("has no Resend key by default (the link is written in the console)", () => {
    expect(getMailConfig({}).resendApiKey).toBeNull();
    expect(getMailConfig({ RESEND_API_KEY: " " }).resendApiKey).toBeNull();
  });

  it("reads the key and the sender", () => {
    expect(getMailConfig({ RESEND_API_KEY: "re_123", MAIL_FROM: "École <a@b.fr>" })).toEqual({
      resendApiKey: "re_123",
      from: "École <a@b.fr>",
    });
  });
});

describe("getLoginRateLimit", () => {
  it("defaults to 10 attempts per minute", () => {
    expect(getLoginRateLimit({})).toBe(10);
  });

  it("reads the limit, and throws on an invalid value", () => {
    expect(getLoginRateLimit({ LOGIN_RATE_LIMIT: "1000" })).toBe(1000);
    expect(() => getLoginRateLimit({ LOGIN_RATE_LIMIT: "0" })).toThrow("LOGIN_RATE_LIMIT");
    expect(() => getLoginRateLimit({ LOGIN_RATE_LIMIT: "beaucoup" })).toThrow("LOGIN_RATE_LIMIT");
  });
});
