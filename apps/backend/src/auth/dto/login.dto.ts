import { Transform } from "class-transformer";
import { IsEmail, IsString } from "class-validator";

// Login DTO to define structure and data format
export class LoginDto {
  // Same form as the saved e-mails (the import of students saves them in lower case)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
