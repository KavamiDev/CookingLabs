import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { UsersService } from "../users/users.service.js";

// Checks credentials and signs the JWT stored in the access_token cookie
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.user({ email });

    // No passwordHash = account not activated yet.
    // Same error in every case so we don't reveal which emails exist.
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException("Email ou mot de passe incorrect");
    }

    // Role in the token: used later to protect admin routes
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { access_token: await this.jwtService.signAsync(payload) };
  }

  // Reloads the user from the database to return up-to-date data
  async me(userId: number) {
    const user = await this.usersService.user({ id: userId });
    // The token can still be valid after the account was deleted
    if (!user) {
      throw new UnauthorizedException();
    }
    // Never return passwordHash or inviteToken
    const { id, email, firstName, lastName, role } = user;
    return { id, email, firstName, lastName, role };
  }
}
