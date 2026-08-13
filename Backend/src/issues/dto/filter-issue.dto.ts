import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IssueStatus, Priority } from '@prisma/client';

export class FilterIssueDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  reporterId?: string;
}
