import { Type } from "class-transformer";
import { IsArray, IsInt, ValidateNested } from "class-validator";

export class LessonsIdsDto {
  @IsInt()
  id: number;

  @IsInt()
  position: number;
}

export class ReorderLessonsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonsIdsDto)
  lessons: LessonsIdsDto[];
}
