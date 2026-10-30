import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AUTH_COOKIE, type AuthenticatedRequest, AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";

// Controller auth to define login and logout method with cookie httpOnly
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 tentatives par minute et par IP
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    // Le service renvoie `access_token` : le nom doit être identique ici (avant : `acces_token` → undefined).
    const { access_token } = await this.authService.login(body.email, body.password);

    // httpOnly : Browser cannot read a cookie
    res.cookie(AUTH_COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours, comme l'expiration du JWT
    });

    return { message: "Connecté" };
  }

  // Disconnect user session
  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE);
    return { message: "Déconnecté" };
  }

  // Returns the logged-in user. AuthGuard verified the cookie
  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.sub);
  }
}
