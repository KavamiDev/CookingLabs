import { Module } from "@nestjs/common";
import { InvitationsModule } from "../invitations/invitations.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  // InvitationsModule gives InvitationsService: each imported student receives a link
  imports: [InvitationsModule],
  controllers: [UsersController],
  providers: [UsersService],

  // Export UserService so that AuthModule may search for a user
  exports: [UsersService],
})
export class UserModule {}
