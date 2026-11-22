import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength, NotContains } from "class-validator";

// Text field sent next to the .html file
export class ImportLessonDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @NotContains("\0", { message: "Le titre contient un caractère interdit" }) // refused by PostgreSQL
  @MaxLength(200, { message: "Le titre ne doit pas dépasser 200 caractères" })
  @IsNotEmpty({ message: "Le titre est obligatoire" })
  @IsString({ message: "Le titre doit être un texte" })
  title: string;
}
