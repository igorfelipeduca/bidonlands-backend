import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import z, { prettifyError } from 'zod';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { and, eq, InferInsertModel } from 'drizzle-orm';
import { advertsTable } from 'src/drizzle/schema/adverts.schema';
import { bidsTable } from 'src/drizzle/schema/bids.schema';
import { UsersService } from 'src/users/users.service';
import { emailTokenTable } from 'src/drizzle/schema/email-tokens.schema';
import { bidIntentsTable } from 'src/drizzle/schema/bid-intents.schema';
import { CreateBidIntentDto } from './dto/create-bid-intent.dto';
import Stripe from 'stripe';
import { EmailService } from 'src/email/email.service';
import { attachmentsTable } from 'src/drizzle/schema/attachments.schema';
import { Money } from '../lib/money-value-object';

@Injectable()
export class BidsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(UsersService)
    private usersService: UsersService,
    @Inject(EmailService)
    private emailsService: EmailService,
  ) {}

  async create(createBidDto: z.infer<typeof CreateBidDto>, userId: number) {
    const { data, error } = CreateBidDto.safeParse(createBidDto);

    if (error) throw new InternalServerErrorException(prettifyError(error));

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');

    const dbAdvert = await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, data.advertId));

    if (!dbAdvert.length) {
      throw new NotFoundException('Advert not found');
    }

    if (dbAdvert[0].id === userId) {
      throw new UnauthorizedException(
        'You can not place a bid on your own advertisement.',
      );
    }

    const dbBidIntent = await this.db
      .select()
      .from(bidIntentsTable)
      .where(eq(bidIntentsTable.id, data.bidIntentId));

    if (!dbBidIntent.length) {
      throw new NotFoundException('Bid intent not found');
    }

    if (dbBidIntent[0].amount !== new Money(data.amount, 'USD').getInCents()) {
      throw new UnauthorizedException(
        'Bid intent and actual bid amounts does not match',
      );
    }

    if (dbUser[0].emailVerified) {
      const dbAdvert = await this.db
        .select()
        .from(advertsTable)
        .where(eq(advertsTable.id, data.advertId))
        .leftJoin(bidsTable, eq(bidsTable.advertId, advertsTable.id));

      if (!dbAdvert.length) {
        throw new NotFoundException('Advertisement not found');
      }

      const advert = dbAdvert[0].adverts;

      const isAdvertExpired =
        advert?.expiresAt && new Date(advert.expiresAt).getTime() < Date.now();

      if (isAdvertExpired) {
        throw new UnauthorizedException(
          'Cannot place a bid on an expired advertisement.',
        );
      }

      const bids = dbAdvert.filter((row) => row.bids).map((row) => row.bids);
      const highestBid = bids.length
        ? Math.max(
            ...bids.map((bid) =>
              new Money(bid.amount, 'USD', { isCents: true }).getInCents(),
            ),
          )
        : null;

      console.log({ highestBid });

      data.amount = new Money(data.amount, 'USD').getInCents();

      const newBid = await this.db
        .insert(bidsTable)
        .values({
          advertId: data.advertId,
          amount: data.amount,
          userId: userId,
        })
        .returning();

      return newBid;
    } else {
      const availableEmail = await this.db
        .select()
        .from(emailTokenTable)
        .where(eq(emailTokenTable.userId, userId));

      const sendVerificationEmail = async () => {
        await this.usersService.sendVerificationEmail(
          dbUser[0]?.email,
          dbUser[0]?.firstName,
        );

        throw new UnauthorizedException(
          "Almost there! To add an attachment, please verify your email address. We've just sent you a verification email - be sure to check your inbox and spam folder. Thanks for helping us keep your account secure!",
        );
      };

      if (!availableEmail[0]) {
        await sendVerificationEmail();
      } else {
        const sentMinutesAgo = Math.floor(
          (Date.now() - availableEmail[0].createdAt.getTime()) / (1000 * 60),
        );

        if (sentMinutesAgo < 10) {
          throw new UnauthorizedException(
            `Heads up! You'll need to verify your email before adding an attachment. We sent you a verification email ${sentMinutesAgo} minute${sentMinutesAgo === 1 ? '' : 's'} ago-please check your inbox and spam folder. Thanks for your patience!`,
          );
        } else {
          await sendVerificationEmail();
        }
      }
    }
  }

  async createBidIntent(
    createBidIntentDto: z.infer<typeof CreateBidIntentDto>,
    userId: number,
  ) {
    const stripe = new Stripe(process.env.STRIPE_KEY ?? '');

    const { data, error } = CreateBidIntentDto.safeParse(createBidIntentDto);

    if (error) {
      throw new BadRequestException(prettifyError(error));
    }

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser.length) {
      throw new NotFoundException('User not found');
    }

    const dbAdvert = await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, data.advertId));

    if (!dbAdvert.length) {
      throw new NotFoundException('Advert not found');
    }

    const existentBidIntents = await this.db
      .select()
      .from(bidIntentsTable)
      .where(
        and(
          eq(bidIntentsTable.advertId, data.advertId),
          eq(bidIntentsTable.amount, bidIntentsTable.amount),
          eq(bidIntentsTable.userId, bidIntentsTable.userId),
        ),
      );

    const notExpiredBidIntents = existentBidIntents.filter(
      (b) => new Date(b.expiresAt).getTime() > Date.now(),
    );

    if (notExpiredBidIntents.length) {
      const mostRecentBidIntent = notExpiredBidIntents.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      const timeUntilExpires =
        new Date(mostRecentBidIntent.expiresAt).getTime() - Date.now();

      await this.emailsService.sendExistingBidIntentEmail(userId, {
        amount: dbAdvert[0].amount,
        depositValue: mostRecentBidIntent.amount,
        paymentLink: mostRecentBidIntent.stripePaymentLink,
        minutesLeft: Math.ceil(timeUntilExpires / 60000),
        depositPercentage: dbAdvert[0].depositPercentage,
      });

      throw new UnauthorizedException(
        `You have an active bid intent for this advert and amount. Please complete payment or wait for it to expire in ${Math.ceil(timeUntilExpires / 60000)} minutes before creating a new one.`,
      );
    } else {
      const userDocs = await this.db
        .select()
        .from(attachmentsTable)
        .where(eq(attachmentsTable.userId, userId));

      const thereIsApprovedPhotoDoc = userDocs.some(
        (d) => d.type === '2' && d.isApproved,
      );

      if (!userDocs.length) {
        throw new UnauthorizedException(
          'You must upload your Photo ID to bid.',
        );
      }

      if (
        !thereIsApprovedPhotoDoc &&
        userDocs.filter((d) => d.type === '2').length > 0
      ) {
        throw new UnauthorizedException(
          "Your Photo ID is still being processed. Please wait until it's approved.",
        );
      }

      if (data.amount < dbAdvert[0].minBidAmount) {
        throw new UnauthorizedException('Bid amount is less than the minimum.');
      }

      const uniqueStripePrice = await stripe.prices.create({
        currency: 'usd',
        unit_amount: new Money(data.amount, 'USD', { isCents: true })
          .percentage(dbAdvert[0].depositPercentage)
          .getInCents(),
        product_data: {
          name: `[BID] ${dbAdvert[0]?.title ?? 'Unknown Advert'} (${dbAdvert[0].depositPercentage}% deposit)`,
        },
      });

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price: uniqueStripePrice.id,
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            advertId: data.advertId,
            userId: userId,
          },
        },
      });

      console.log({ paymentLink });

      const insertData = {
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        stripePaymentLink: paymentLink.url,
        stripePaymentLinkId: paymentLink.id,
        stripeUniquePrice: uniqueStripePrice.id,
        userId,
        amount: new Money(data.amount, 'USD')
          .percentage(dbAdvert[0].depositPercentage)
          .getInCents(),
        advertId: data.advertId,
        bidAmount: data.amount,
      } as InferInsertModel<typeof bidIntentsTable>;

      const newBidIntent = await this.db
        .insert(bidIntentsTable)
        .values(insertData)
        .returning();

      await this.emailsService.sendBidIntentEmail(userId, {
        amount: new Money(data.amount, 'USD').getInCents(),
        paymentLink: paymentLink.url,
        depositValue: new Money(data.amount, 'USD')
          .percentage(dbAdvert[0].depositPercentage)
          .getInCents(),
        depositPercentage: dbAdvert[0].depositPercentage,
      });

      return newBidIntent;
    }
  }

  async findUsersBidIntents(userId: number) {
    const stripe = new Stripe(process.env.STRIPE_KEY ?? '');

    const dbUser = await this.db
      .select()
      .from(bidIntentsTable)
      .where(eq(bidIntentsTable.userId, userId));

    if (!dbUser.length) throw new NotFoundException('User not found');

    const bids = await this.db
      .select()
      .from(bidIntentsTable)
      .where(eq(bidIntentsTable.userId, userId));

    for (const bid of bids) {
      const isExpired = new Date(bid.expiresAt).getTime() < Date.now();

      if (isExpired) {
        // deactivating payment link on stripe
        await stripe.paymentLinks.update(bid.stripePaymentLinkId, {
          active: false,
        });
      }
    }

    return bids;
  }

  async findAll() {
    return await this.db.select().from(bidsTable);
  }

  async findOne(id: number) {
    const dbBid = await this.db
      .select()
      .from(bidsTable)
      .where(eq(bidsTable.id, id));

    if (!dbBid) {
      return undefined;
    }

    return dbBid;
  }

  async update(
    id: number,
    updateBidDto: z.infer<typeof UpdateBidDto>,
    userId: number,
  ) {
    const { data, error } = UpdateBidDto.safeParse(updateBidDto);

    if (error) throw new InternalServerErrorException(prettifyError(error));

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');
    if (dbUser[0].id === userId) {
      throw new UnauthorizedException(
        'You can not place a bid on your own advertisement.',
      );
    }

    const dbAdvert = await this.db
      .select()
      .from(advertsTable)
      .innerJoin(bidsTable, eq(bidsTable.advertId, advertsTable.id))
      .where(eq(bidsTable.id, id));

    if (!dbAdvert.length) {
      throw new NotFoundException('Advertisement not found');
    }

    const advert = dbAdvert[0].adverts[0];
    const bid = dbAdvert[0].bids[0] as InferInsertModel<typeof bidsTable>;

    const isAdvertExpired =
      advert[0]?.expiresAt &&
      new Date(advert[0].expiresAt).getTime() < Date.now();

    if (isAdvertExpired) {
      throw new UnauthorizedException(
        'Cannot place a bid on an expired advertisement.',
      );
    }

    if (data.amount * 100 < bid.amount * 100) {
      throw new UnauthorizedException(
        'You can not place a bid lower than the current bid',
      );
    }

    data.amount = new Money(data.amount, 'USD').getInCents();

    const updatedBid = await this.db.update(bidsTable).set(data).returning();

    return updatedBid;
  }

  async remove(id: number) {
    return `This action removes a #${id} bid`;
  }
}
