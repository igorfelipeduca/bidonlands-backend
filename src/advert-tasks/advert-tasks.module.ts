import { Module } from '@nestjs/common';
import { AdvertTasksService } from './advert-tasks.service';
import { AdvertsModule } from 'src/adverts/adverts.module';
import { AdvertsService } from 'src/adverts/adverts.service';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { EmailModule } from 'src/email/email.module';
import { EmailService } from 'src/email/email.service';
import { AuthService } from 'src/auth/auth.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsersService } from 'src/users/users.service';

@Module({
  providers: [
    AdvertTasksService,
    AdvertsService,
    EmailService,
    AuthService,
    UsersService,
    AdvertsService,
  ],
  exports: [AdvertTasksService],
  imports: [AdvertsModule, DrizzleModule, AuthModule],
})
export class AdvertTasksModule {}
