import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { UsersService } from "../users/users.service.js";

// Class authService which define async function login with an sign acces_token
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.user({ email });

    // passwordHash est null tant que l'utilisateur n'a pas défini son mot de passe
    // (compte invité, pas encore activé) : il ne peut donc pas se connecter.
    // Même message d'erreur dans tous les cas, pour ne pas révéler quels e-mails existent.
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException("Email ou mot de passe incorrect");
    }

    // Le rôle est mis dans le token pour pouvoir protéger plus tard les routes réservées à l'admin.
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
