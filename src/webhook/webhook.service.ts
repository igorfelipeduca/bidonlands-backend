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
import { bidIntentsTable } from 'src/drizzle/schema/bid-intents.schema';
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
    try {
      const { data, error } =
        StripePaymentCompletedDto.safeParse(stripeRequest);

      if (error) {
        throw new BadRequestException(z.prettifyError(error));
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
            eq(
              bidIntentsTable.userId,
              Number(data.data.object.metadata.userId),
            ),
          ),
        );

      if (!bidIntent.length) {
        throw new NotFoundException('Bid intent not found');
      }

      const insertBidData = {
        advertId: bidIntent[0].advertId,
        amount: bidIntent[0].bidAmount,
        userId: bidIntent[0].userId,
        bidIntentId: bidIntent[0].id,
        active: true,
      } as InferInsertModel<typeof bidsTable>;

      const createdBid = await this.bidsService.create(
        insertBidData,
        bidIntent[0].userId,
      );

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

      this.bidsGateway.handleBid({
        advertId: bidIntent[0].advertId,
        amount: bidIntent[0].bidAmount,
        userId: bidIntent[0].userId,
        bidId: createdBid[0].id,
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error while intercepting the completed payment signal from Stripe',
      );
    }
  }
}
