import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GithubLinkGuard extends AuthGuard('github') implements CanActivate {
  constructor(private readonly jwtService: JwtService) { super(); }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = typeof request.query.token === 'string' ? request.query.token : '';
    try {
      const user = await this.jwtService.verifyAsync<{ sub: string }>(token);
      request.githubLinkState = this.jwtService.sign({ sub: user.sub, purpose: 'github-link' }, { expiresIn: '10m' });
    } catch {
      throw new UnauthorizedException('A valid session is required to connect GitHub');
    }
    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    return { state: context.switchToHttp().getRequest().githubLinkState };
  }
}
