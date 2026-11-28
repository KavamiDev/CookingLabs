import { Module } from "@nestjs/common";
import { InvitationsController } from "./invitations.controller.js";
import { InvitationsService } from "./invitations.service.js";
import { MailService } from "./mail.service.js";

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService, MailService],
  // Exported: the import of users (A002) sends an invitation to each new student
  exports: [InvitationsService],
})
export class InvitationsModule {}
