import { type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AUTH_COOKIE, type AuthenticatedRequest, AuthGuard } from "./auth.guard.js";

// Fake Nest context: the guard only needs switchToHttp().getRequest()
function contextFor(request: Partial<AuthenticatedRequest>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

// Test AuthGuard with jwt secret and guard
describe("AuthGuard", () => {
  const jwtService = new JwtService({ secret: "secret-de-test" });
  const guard = new AuthGuard(jwtService);

  it("rejects a request without cookie", async () => {
    await expect(guard.canActivate(contextFor({ cookies: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects a token signed with another secret", async () => {
    const forged = await new JwtService({ secret: "autre-secret" }).signAsync({ sub: 1 });

    await expect(
      guard.canActivate(contextFor({ cookies: { [AUTH_COOKIE]: forged } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("accepts a valid token and fills request.user", async () => {
    const token = await jwtService.signAsync({
      sub: 1,
      email: "eleve@test.local",
      role: "student",
    });
    const request: Partial<AuthenticatedRequest> = { cookies: { [AUTH_COOKIE]: token } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: 1, email: "eleve@test.local", role: "student" });
  });
});
