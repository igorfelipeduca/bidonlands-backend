import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { UsersService } from 'src/users/users.service';
import { EmailService } from 'src/email/email.service';
import { PaymentsService } from 'src/payments/payments.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [BidsController],
  providers: [BidsService, UsersService, EmailService, PaymentsService],
  imports: [
    DrizzleModule,
    UsersModule,
    EmailModule,
    PaymentsModule,
    AuthModule,
  ],
})
export class BidsModule {}
