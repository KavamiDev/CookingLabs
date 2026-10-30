import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { UserRole } from "../generated/prisma/client.js";

// Cookie holding the JWT (set on login, cleared on logout)
export const AUTH_COOKIE = "access_token";

// JWT content
export type JwtPayload = { sub: number; email: string; role: UserRole };

// Request that passed AuthGuard
export type AuthenticatedRequest = Request & { user: JwtPayload };

// Protects a route with @UseGuards(AuthGuard): 401 without a valid JWT cookie
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // request.cookies is filled by cookie-parser (see main.ts)
    const token: string | undefined = request.cookies?.[AUTH_COOKIE];
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      // Rejects a modified, forged or expired token
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
