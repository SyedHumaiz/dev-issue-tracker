import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateAssigneeDto {
  @IsString()
  @IsOptional()
  @ValidateIf((object, value) => value !== null)
  assigneeId?: string | null;
}

