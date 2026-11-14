import { PartialType } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

// PartialType is used to create a new DTO class that inherits
// from the CreateCourseDto class, but with all properties marked as optional.
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
