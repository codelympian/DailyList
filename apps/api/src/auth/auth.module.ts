import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SupabaseTokenService } from './supabase-token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseTokenService, SessionAuthGuard],
  exports: [SupabaseTokenService, SessionAuthGuard],
})
export class AuthModule {}
