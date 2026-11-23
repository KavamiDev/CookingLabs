import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JwtPayload } from "../auth/auth.guard.js";
import { RolesGuard } from "./roles.guard.js";

// Fake Nest context: the guard reads the route roles and request.user
function contextFor(user?: JwtPayload) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const admin: JwtPayload = { sub: 1, email: "admin@test.local", role: "admin" };
  const student: JwtPayload = { sub: 2, email: "eleve@test.local", role: "student" };

  it("lets everyone through when the route has no @Roles", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it("lets an admin through on an admin route", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
    expect(guard.canActivate(contextFor(admin))).toBe(true);
  });

  it("rejects a student with 403", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
    expect(() => guard.canActivate(contextFor(student))).toThrow(ForbiddenException);
  });

  it("rejects with 403 (not 500) when no user is set", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
  });
});
