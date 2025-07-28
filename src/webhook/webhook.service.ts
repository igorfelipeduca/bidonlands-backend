import { Inject, Injectable } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import z from 'zod';
import { StripePaymentCompletedDto } from './dto/stripe-payment-completed.dto';
import { EmailService } from 'src/email/email.service';
import { PaymentsService } from 'src/payments/payments.service';

@Injectable()
export class WebhookService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(EmailService)
    private emailService: EmailService,
    @Inject(PaymentsService)
    private paymentsService: PaymentsService,
  ) {}

  async onPaymentLinkSucceed(
    stripeRequest: z.infer<typeof StripePaymentCompletedDto>,
  ) {
    await this.paymentsService.processPayment(
      stripeRequest.data.object.receipt_email,
      stripeRequest.data.object.amount_received,
    );
  }
}
