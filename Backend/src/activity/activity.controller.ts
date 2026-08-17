import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('issues/:issueId/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  findByIssue(@Param('issueId') issueId: string, @CurrentUser() user: any) {
    return this.activityService.findByIssue(issueId, user.id);
  }
}
