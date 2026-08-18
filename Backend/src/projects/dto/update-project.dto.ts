import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
