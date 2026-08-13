import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('issues/:issueId/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  findByIssue(@Param('issueId') issueId: string) {
    return this.activityService.findByIssue(issueId);
  }
}
