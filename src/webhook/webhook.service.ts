import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import z, { prettifyError } from 'zod';
import { StripePaymentCompletedDto } from './dto/stripe-payment-completed.dto';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { and, eq, InferInsertModel } from 'drizzle-orm';
import { bidIntentsTable } from 'src/drizzle/schema/bid-intents.schema';
import { bidsTable } from 'src/drizzle/schema/bids.schema';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class WebhookService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(EmailService)
    private emailService: EmailService,
  ) {}

  async onPaymentLinkSucceed(
    stripeRequest: z.infer<typeof StripePaymentCompletedDto>,
  ) {
    const { data, error } = StripePaymentCompletedDto.safeParse(stripeRequest);

    if (error) {
      console.error(prettifyError(error));

      throw new InternalServerErrorException(prettifyError(error));
    }

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, Number(data.data.object.metadata.userId)));

    if (!dbUser.length) {
      throw new NotFoundException('User not found');
    }

    const bidIntent = await this.db
      .select()
      .from(bidIntentsTable)
      .where(
        and(
          eq(
            bidIntentsTable.advertId,
            Number(data.data.object.metadata.advertId),
          ),
          eq(bidIntentsTable.userId, Number(data.data.object.metadata.userId)),
        ),
      );

    if (!bidIntent.length) {
      throw new NotFoundException('Bid intent not found');
    }

    const insertBidData = {
      advertId: bidIntent[0].advertId,
      amount: bidIntent[0].bidAmount,
      userId: bidIntent[0].userId,
      active: true,
    } as InferInsertModel<typeof bidsTable>;

    await this.db.insert(bidsTable).values(insertBidData);
    await this.db
      .delete(bidIntentsTable)
      .where(eq(bidIntentsTable.id, bidIntent[0].id));

    await this.emailService.sendBidDepositConfirmationEmail(
      Number(data.data.object.metadata.userId),
      {
        amount: bidIntent[0].bidAmount,
        depositValue: bidIntent[0].amount,
      },
    );
  }
}
