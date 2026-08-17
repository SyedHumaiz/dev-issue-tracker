import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('issues/:issueId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Param('issueId') issueId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    // authorId comes from the JWT — not from the request body
    return this.commentsService.create(issueId, dto, user.id);
  }

  @Get()
  findByIssue(@Param('issueId') issueId: string, @CurrentUser() user: any) {
    return this.commentsService.findByIssue(issueId, user.id);
  }
}
