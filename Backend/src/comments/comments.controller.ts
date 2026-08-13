import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('issues/:issueId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Param('issueId') issueId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(issueId, dto);
  }

  @Get()
  findByIssue(@Param('issueId') issueId: string) {
    return this.commentsService.findByIssue(issueId);
  }
}
