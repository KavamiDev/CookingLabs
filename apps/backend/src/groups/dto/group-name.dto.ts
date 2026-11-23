import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength, NotContains } from "class-validator";

// Body of POST /groups and PATCH /groups/:id
export class GroupNameDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @NotContains("\0", { message: "Le nom contient un caractère interdit" }) // refused by PostgreSQL
  @MaxLength(100, { message: "Le nom ne doit pas dépasser 100 caractères" })
  @IsNotEmpty({ message: "Le nom du groupe est obligatoire" })
  @IsString({ message: "Le nom doit être un texte" })
  name: string;
}
