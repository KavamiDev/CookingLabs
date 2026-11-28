import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../roles_guard/roles.decorator.js";
import { RolesGuard } from "../roles_guard/roles.guard.js";
import { ActivateDto } from "./dto/activate.dto.js";
import { InviteDto } from "./dto/invite.dto.js";
import { InvitationsService } from "./invitations.service.js";

@Controller("invitations")
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // Admin only: sends a (new) invitation link, for example when the first one expired
  @Post()
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(["admin"])
  invite(@Body() body: InviteDto) {
    return this.invitationsService.invite(body.userId);
  }

  // Public: the student is not logged in yet, the token in the link is the proof.
  // Limited like the login, to slow down anyone trying random tokens.
  @Post("accept")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async accept(@Body() body: ActivateDto) {
    await this.invitationsService.activate(body.token, body.password);
    return { message: "Compte activé" };
  }
}
