import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IssueStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(IssueStatus)
  @IsNotEmpty()
  status: IssueStatus;

  @IsString()
  @IsNotEmpty()
  actorId: string;
}
