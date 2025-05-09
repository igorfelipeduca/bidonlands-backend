import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import z from 'zod';
import { StripePaymentCompletedDto } from './dto/stripe-payment-completed.dto';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { and, eq, InferInsertModel } from 'drizzle-orm';
import { bidsTable } from 'src/drizzle/schema/bids.schema';
import { EmailService } from 'src/email/email.service';
import { BidsGateway } from 'src/gateways/bids.gateway';
import { BidsService } from 'src/bids/bids.service';

@Injectable()
export class WebhookService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(EmailService)
    private emailService: EmailService,
    @Inject(BidsGateway)
    private bidsGateway: BidsGateway,
    @Inject(BidsService)
    private bidsService: BidsService,
  ) {}

  async onPaymentLinkSucceed(
    stripeRequest: z.infer<typeof StripePaymentCompletedDto>,
  ) {
    console.log({ stripeRequest });
  }
}
