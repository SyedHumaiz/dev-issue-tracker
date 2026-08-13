import { IsEnum, IsNotEmpty } from 'class-validator';
import { IssueStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(IssueStatus)
  @IsNotEmpty()
  status: IssueStatus;
}

