import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { FilterIssueDto } from './dto/filter-issue.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { UpdateAssigneeDto } from './dto/update-assignee.dto';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  create(@Body() dto: CreateIssueDto) {
    return this.issuesService.create(dto);
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
  update(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
    return this.issuesService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.issuesService.updateStatus(id, dto);
  }

  @Patch(':id/priority')
  updatePriority(@Param('id') id: string, @Body() dto: UpdatePriorityDto) {
    return this.issuesService.updatePriority(id, dto);
  }

  @Patch(':id/assignee')
  updateAssignee(@Param('id') id: string, @Body() dto: UpdateAssigneeDto) {
    return this.issuesService.updateAssignee(id, dto);
  }
}
