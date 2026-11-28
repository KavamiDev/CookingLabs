import { IsInt, IsPositive } from "class-validator";

// Body of POST /api/invitations: the account that receives a (new) link
export class InviteDto {
  @IsInt()
  @IsPositive()
  userId!: number;
}
