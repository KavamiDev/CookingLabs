import { Module } from "@nestjs/common";
import { UsersService } from "./users.service.js";

@Module({
  providers: [UsersService],

  // Export UserService so that AuthModule may search for a user
  exports: [UsersService],
})
export class UserModule {}
