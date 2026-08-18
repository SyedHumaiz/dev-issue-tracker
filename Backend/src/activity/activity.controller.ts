import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('issues/:issueId/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  findByIssue(@Param('issueId') issueId: string, @Query('cursor') cursor: string | undefined, @Query('limit') limit: string | undefined, @CurrentUser() user: any) {
    return this.activityService.findByIssue(issueId, user.id, cursor, limit);
  }
}
