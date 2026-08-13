import { Controller, Get, Param } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('issues/:issueId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  findByIssue(@Param('issueId') issueId: string) {
    return this.activityService.findByIssue(issueId);
  }
}
