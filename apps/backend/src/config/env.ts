// Reads the environment variables the API cannot run without.
// Each function takes `env` as a parameter (process.env by default) so the tests can pass fake values.

// Secret that signs the login tokens (JWT).
// Without it, tokens would be signed with an empty key: the API must refuse to start.
export function getJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is missing: set it in apps/backend/.env (see .env.example)");
  }
  return secret;
}

// Number of proxies in front of the API (Railway, Fly.io...), used by Express to read the real
// client IP for the rate limiter. 0 in local development: no proxy, so X-Forwarded-For is ignored.
export function getTrustProxy(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.TRUST_PROXY?.trim() || "0";
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error(`TRUST_PROXY must be a whole number >= 0, got "${value}"`);
  }
  return hops;
}

// Address of the website, used to build the links sent by e-mail (invitation).
// http://localhost:3000 in local development.
export function getFrontendUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.FRONTEND_URL?.trim() || "http://localhost:3000";
  // No trailing slash: the links are built as `${url}/activation?...`
  return url.replace(/\/+$/, "");
}

// Settings to send e-mails with Resend (https://resend.com).
// Without RESEND_API_KEY, the e-mails are not sent: their content is written in the console.
export function getMailConfig(env: NodeJS.ProcessEnv = process.env): {
  resendApiKey: string | null;
  from: string;
} {
  return {
    resendApiKey: env.RESEND_API_KEY?.trim() || null,
    // Resend's test sender: works without a verified domain, but only towards your own address
    from: env.MAIL_FROM?.trim() || "CookingLabs <onboarding@resend.dev>",
  };
}

// Number of login (and invitation) attempts allowed per minute and per IP. 10 by default.
// Only the end-to-end tests raise it: all their browsers share the same IP (localhost).
export function getLoginRateLimit(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.LOGIN_RATE_LIMIT?.trim() || "10";
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`LOGIN_RATE_LIMIT must be a whole number >= 1, got "${value}"`);
  }
  return limit;
}
