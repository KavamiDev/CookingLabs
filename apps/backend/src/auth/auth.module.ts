import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { getJwtSecret } from "../config/env.js";
import { UserModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

// File auth.module which define module import, controller and service
@Module({
  imports: [
    UserModule,
    // registerAsync: the secret is read when the app starts, and the start fails if it is missing
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({ secret: getJwtSecret(), signOptions: { expiresIn: "7d" } }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
