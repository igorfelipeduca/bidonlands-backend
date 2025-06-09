import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  imports: [DrizzleModule, EmailModule],
})
export class PaymentsModule {}
