import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

// File auth.module which define module import, controller and service
@Module({
  imports: [
    UserModule,
    JwtModule.register({
      global: true,
      // Clé secrète qui signe les tokens : à définir dans .env (voir .env.example).
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
