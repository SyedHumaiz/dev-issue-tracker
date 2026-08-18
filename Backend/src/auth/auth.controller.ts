import { Controller, Post, Get, Delete, Body, UseGuards, HttpCode, HttpStatus, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { GithubLinkGuard } from './github-link.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly jwtService: JwtService) {}

  // POST /auth/signup — public
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // POST /auth/login — public
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // GET /auth/me — protected: returns the authenticated user
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: any) {
    return user;
  }

  @Get('github')
  @UseGuards(GithubLinkGuard)
  connectGithub() {
    // Passport performs the redirect before this handler is reached.
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() request: Request, @Res() response: Response) {
    const state = typeof request.query.state === 'string' ? request.query.state : '';
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; purpose: string }>(state);
      if (payload.purpose !== 'github-link') throw new UnauthorizedException('Invalid GitHub linking state');
      const github = request.user as { githubId: string; githubUsername: string; accessToken: string };
      await this.authService.connectGithub(payload.sub, github);
      return response.redirect('devtracker://github-connected?status=success');
    } catch {
      // The client distinguishes this from a completed link and never shows a false-positive state.
      return response.redirect('devtracker://github-connected?status=error&reason=link_failed');
    }
  }

  @Delete('github')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnectGithub(@CurrentUser() user: any) {
    await this.authService.disconnectGithub(user.id);
  }
}
