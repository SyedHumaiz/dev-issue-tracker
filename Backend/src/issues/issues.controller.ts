import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { FilterIssueDto } from './dto/filter-issue.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { UpdateAssigneeDto } from './dto/update-assignee.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('issues')
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  create(@Body() dto: CreateIssueDto, @CurrentUser() user: any) {
    // reporterId comes from the JWT — not from the request body
    return this.issuesService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() filter: FilterIssueDto) {
    return this.issuesService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIssueDto, @CurrentUser() user: any) {
    // actorId comes from the JWT — not from the request body
    return this.issuesService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: any) {
    return this.issuesService.updateStatus(id, dto, user.id);
  }

  @Patch(':id/priority')
  updatePriority(@Param('id') id: string, @Body() dto: UpdatePriorityDto, @CurrentUser() user: any) {
    return this.issuesService.updatePriority(id, dto, user.id);
  }

  @Patch(':id/assignee')
  updateAssignee(@Param('id') id: string, @Body() dto: UpdateAssigneeDto, @CurrentUser() user: any) {
    return this.issuesService.updateAssignee(id, dto, user.id);
  }
}
