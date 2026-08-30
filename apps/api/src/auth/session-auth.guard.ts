import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { Session, User } from '@dailylist/database';
import { SESSION_COOKIE, SessionService } from './session.service';

export interface AuthenticatedRequest extends Request {
  user: User;
  session: Session;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    const session = token ? await this.sessions.validateToken(token) : null;
    if (!session) {
      throw new UnauthorizedException('Not authenticated');
    }
    request.user = session.user;
    request.session = session;
    return true;
  }
}
