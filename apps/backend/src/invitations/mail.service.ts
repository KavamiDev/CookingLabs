import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { getMailConfig } from "../config/env.js";

// Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email)
const RESEND_URL = "https://api.resend.com/emails";

// Sends the e-mails of the app.
// - With RESEND_API_KEY: the e-mail is sent by Resend
// - Without it, in development and tests: the link is written in the console instead
// - Without it, in production: refused, so a link is never left in the server logs
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendInvitation(to: string, link: string): Promise<void> {
    const subject = "Votre invitation sur CookingLabs";
    const html = [
      "<p>Bonjour,</p>",
      "<p>Votre école vous a créé un compte sur CookingLabs.</p>",
      `<p><a href="${link}">Choisir mon mot de passe</a></p>`,
      "<p>Ce lien est valable 7 jours et ne fonctionne qu'une seule fois.</p>",
    ].join("\n");

    const { resendApiKey, from } = getMailConfig();
    if (!resendApiKey) {
      if (process.env.NODE_ENV === "production") {
        this.logger.error("RESEND_API_KEY is missing: the invitation e-mail cannot be sent");
        throw new ServiceUnavailableException("L'envoi d'e-mails n'est pas configuré");
      }
      this.logger.log(`Invitation for ${to} (e-mail not sent, development): ${link}`);
      return;
    }

    // fetch is built into Node.js: no extra dependency needed for one HTTP call
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      // The error body may help to fix the settings (wrong key, sender not verified...)
      this.logger.error(`Resend refused the e-mail to ${to}: ${res.status} ${await res.text()}`);
      throw new ServiceUnavailableException("L'e-mail d'invitation n'a pas pu être envoyé");
    }
  }
}
