import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import { UsersService } from "../users/users.service.js";
import { AuthService } from "./auth.service.js";

// Test for Authentification
describe("AuthService", () => {
  const jwtService = new JwtService({ secret: "secret-de-test" });

  // Mock
  const usersService = { user: vi.fn() };
  let authService: AuthService;
  let activeUser: object;

  // Create user for mock that run 1 time before all test
  beforeAll(async () => {
    activeUser = {
      id: 1,
      email: "eleve@test.local",
      firstName: "Jean",
      lastName: "Dupont",
      role: "student",
      passwordHash: await argon2.hash("bonmotdepasse"),
    };
  });

  // Before each Mock. Reset the mock an create AuthService
  beforeEach(async () => {
    usersService.user.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    authService = module.get(AuthService);
  });

  // Test for valid login
  describe("login", () => {
    it("returns a signed token containing id, email and role", async () => {
      usersService.user.mockResolvedValue(activeUser);

      const { access_token } = await authService.login("eleve@test.local", "bonmotdepasse");

      await expect(jwtService.verifyAsync(access_token)).resolves.toMatchObject({
        sub: 1,
        email: "eleve@test.local",
        role: "student",
      });
    });

    // Reject a wrong password with good mail
    it("rejects a wrong password", async () => {
      usersService.user.mockResolvedValue(activeUser);

      await expect(authService.login("eleve@test.local", "mauvais")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Reject unknown email and good password
    it("rejects an unknown email", async () => {
      usersService.user.mockResolvedValue(null);

      await expect(authService.login("inconnu@test.local", "bonmotdepasse")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Reject an account with password not activated
    it("rejects an account without password (not activated)", async () => {
      usersService.user.mockResolvedValue({ ...activeUser, passwordHash: null });

      await expect(authService.login("eleve@test.local", "bonmotdepasse")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // Test auth/me that allow return user during the session
  describe("me", () => {
    it("returns the user without passwordHash", async () => {
      usersService.user.mockResolvedValue(activeUser);

      const user = await authService.me(1);

      expect(user).toEqual({
        id: 1,
        email: "eleve@test.local",
        firstName: "Jean",
        lastName: "Dupont",
        role: "student",
      });
      expect(user).not.toHaveProperty("passwordHash");
    });

    // Reject a user that not have token
    it("rejects a user deleted since the token was issued", async () => {
      usersService.user.mockResolvedValue(null);

      await expect(authService.me(1)).rejects.toThrow(UnauthorizedException);
    });
  });
});
