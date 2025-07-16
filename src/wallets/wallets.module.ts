import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { EmailService } from 'src/email/email.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [WalletsController],
  providers: [WalletsService, UsersService, EmailService],
  imports: [UsersModule, DrizzleModule, AuthModule],
})
export class WalletsModule {}
