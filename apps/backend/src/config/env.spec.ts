import { getJwtSecret, getTrustProxy } from "./env.js";

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
