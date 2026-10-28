import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
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

    // httpOnly : le JavaScript du navigateur ne peut pas lire le cookie (protection contre le vol par XSS).
    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours, comme l'expiration du JWT
    });

    return { message: "Connecté" };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("access_token");
    return { message: "Déconnecté" };
  }
}
