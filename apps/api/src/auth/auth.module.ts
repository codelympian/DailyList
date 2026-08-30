import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, SessionAuthGuard],
  exports: [SessionService, SessionAuthGuard],
})
export class AuthModule {}
