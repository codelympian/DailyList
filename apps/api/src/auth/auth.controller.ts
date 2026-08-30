import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { User } from '@dailylist/database';
import type { AuthResponse, MeResponse } from '@dailylist/types';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@dailylist/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { SessionAuthGuard } from './session-auth.guard';
import { SESSION_COOKIE, SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, token } = await this.auth.register(input);
    res.cookie(SESSION_COOKIE, token, this.sessions.cookieOptions());
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, token } = await this.auth.login(input);
    res.cookie(SESSION_COOKIE, token, this.sessions.cookieOptions());
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (token) {
      await this.sessions.revokeToken(token);
    }
    res.clearCookie(SESSION_COOKIE, { ...this.sessions.cookieOptions(), maxAge: undefined });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: User): Promise<MeResponse> {
    return this.auth.me(user.id);
  }
}
