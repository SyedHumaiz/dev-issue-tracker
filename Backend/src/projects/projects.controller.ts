import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post(':id/members')
  addMember(@Param('id') projectId: string, @Body() dto: AddMemberDto) {
    return this.projectsService.addMember(projectId, dto);
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.projectsService.updateMemberRole(projectId, userId, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') projectId: string, @Param('userId') userId: string) {
    return this.projectsService.removeMember(projectId, userId);
  }
}
