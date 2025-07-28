import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { EmailModule } from 'src/email/email.module';
import { WalletsModule } from 'src/wallets/wallets.module';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  imports: [DrizzleModule, EmailModule, forwardRef(() => WalletsModule)],
  exports: [PaymentsService],
})
export class PaymentsModule {}
