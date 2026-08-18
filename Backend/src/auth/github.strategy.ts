import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: process.env.GITHUB_CALLBACK_URL || '',
      scope: ['repo', 'read:user'],
    });
  }

  validate(accessToken: string, _refreshToken: string | undefined, profile: { id: string; username?: string; _json?: { login?: string } }) {
    const githubUsername = profile.username || profile._json?.login;
    return { githubId: profile.id, githubUsername, accessToken };
  }
}
