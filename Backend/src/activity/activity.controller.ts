import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('issues/:issueId/activity')
  findByIssue(@Param('issueId') issueId: string, @Query('cursor') cursor: string | undefined, @Query('limit') limit: string | undefined, @CurrentUser() user: any) {
    return this.activityService.findByIssue(issueId, user.id, cursor, limit);
  }

  @Get('projects/:projectId/activity')
  findByProject(@Param('projectId') projectId: string, @Query('cursor') cursor: string | undefined, @Query('limit') limit: string | undefined, @CurrentUser() user: any) {
    return this.activityService.findByProject(projectId, user.id, cursor, limit);
  }
}
