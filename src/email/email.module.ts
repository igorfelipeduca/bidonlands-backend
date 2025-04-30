import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { drizzleProvider } from 'src/drizzle/drizzle.provider';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DrizzleModule, forwardRef(() => AuthModule), ConfigModule],
  controllers: [EmailController],
  providers: [EmailService, ...drizzleProvider, ConfigService],
  exports: [EmailService],
})
export class EmailModule {}
