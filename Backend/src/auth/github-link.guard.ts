import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

function isSupportedRedirectUri(value: string): boolean {
  try {
    const redirectUri = new URL(value);
    const isExpoGoUri = (redirectUri.protocol === 'exp:' || redirectUri.protocol === 'exps:')
      && /^\/--\/github-connected\/?$/.test(redirectUri.pathname);
    const isStandaloneUri = redirectUri.protocol === 'devtracker:'
      && redirectUri.hostname === 'github-connected';
    return isExpoGoUri || isStandaloneUri;
  } catch {
    return false;
  }
}

@Injectable()
export class GithubLinkGuard extends AuthGuard('github') implements CanActivate {
  constructor(private readonly jwtService: JwtService) { super(); }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = typeof request.query.token === 'string' ? request.query.token : '';
    const redirectUri = typeof request.query.redirectUri === 'string' ? request.query.redirectUri : '';
    try {
      const user = await this.jwtService.verifyAsync<{ sub: string }>(token);
      if (!isSupportedRedirectUri(redirectUri)) throw new UnauthorizedException('Invalid GitHub redirect URI');
      request.githubLinkState = this.jwtService.sign({ sub: user.sub, purpose: 'github-link', redirectUri }, { expiresIn: '10m' });
    } catch {
      throw new UnauthorizedException('A valid session is required to connect GitHub');
    }
    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    return { state: context.switchToHttp().getRequest().githubLinkState };
  }
}
