import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  githubRepoFullName?: string;
}
