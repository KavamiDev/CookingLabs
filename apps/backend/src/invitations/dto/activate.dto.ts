import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

// Minimum length of a password (A004)
export const MIN_PASSWORD_LENGTH = 12;

// Body of POST /api/invitations/accept
export class ActivateDto {
  // The token of the link (43 characters). MaxLength: no need to hash a huge text.
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;

  // MaxLength: argon2 on a very long text would cost CPU for nothing
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`,
  })
  @MaxLength(128, { message: "Le mot de passe doit contenir au plus 128 caractères" })
  password!: string;
}
