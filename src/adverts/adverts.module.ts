import { Module } from '@nestjs/common';
import { AdvertsService } from './adverts.service';
import { AdvertsController } from './adverts.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { AuthModule } from 'src/auth/auth.module';
import { EmailModule } from 'src/email/email.module';
import { EmailService } from 'src/email/email.service';

@Module({
  controllers: [AdvertsController],
  providers: [AdvertsService, EmailService],
  imports: [DrizzleModule, AuthModule, EmailModule],
})
export class AdvertsModule {}
