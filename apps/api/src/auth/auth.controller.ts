import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { User } from '@dailylist/database';
import type { MeResponse } from '@dailylist/types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { SessionAuthGuard } from './session-auth.guard';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100),
});

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * There is deliberately no /auth/register, /auth/login or /auth/logout here.
 * The browser talks to Supabase directly for all three, so credentials never
 * pass through this API — which is the point of the migration.
 */
@Controller('auth')
@UseGuards(SessionAuthGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: User): Promise<MeResponse> {
    return this.auth.me(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileInput,
  ): Promise<MeResponse> {
    return this.auth.updateName(user.id, input.name);
  }
}
