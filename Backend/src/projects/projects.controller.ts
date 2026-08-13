import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: any) {
    // The authenticated user automatically becomes the project OWNER
    return this.projectsService.create(dto, user.id);
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
  addMember(
    @Param('id') projectId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: any,
  ) {
    // actorId from JWT — ProjectsService.requireOwner() checks their role
    return this.projectsService.addMember(projectId, dto, user.id);
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.updateMemberRole(projectId, userId, dto, user.id);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.removeMember(projectId, userId, user.id);
  }
}
