import { IsIn, IsOptional } from 'class-validator';

export const MERGE_METHODS = ['merge', 'squash', 'rebase'] as const;
export type MergeMethod = (typeof MERGE_METHODS)[number];

export class MergePullRequestDto {
  @IsOptional()
  @IsIn(MERGE_METHODS)
  mergeMethod?: MergeMethod;
}
