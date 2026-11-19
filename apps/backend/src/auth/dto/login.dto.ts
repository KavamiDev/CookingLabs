import { IsEmail, IsString } from "class-validator";

// Login DTO to define structure and data format
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
