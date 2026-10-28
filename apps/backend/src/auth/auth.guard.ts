import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { UserRole } from "../generated/prisma/client.js";

/** Nom du cookie qui contient le JWT (posé au login, vidé au logout). */
export const AUTH_COOKIE = "access_token";

/** Contenu du JWT, tel que créé par AuthService.login. */
export type JwtPayload = { sub: number; email: string; role: UserRole };

/** Requête qui a passé AuthGuard : `user` contient le JWT décodé. */
export type AuthenticatedRequest = Request & { user: JwtPayload };

/**
 * Protège une route : laisse passer seulement si le cookie contient un JWT valide
 * (bonne signature, pas expiré). Sinon : 401.
 * Utilisation : @UseGuards(AuthGuard) au-dessus d'une route.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // request.cookies est rempli par cookie-parser (voir main.ts).
    const token: string | undefined = request.cookies?.[AUTH_COOKIE];
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      // Vérifie la signature avec JWT_SECRET : un token modifié ou inventé est rejeté.
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
