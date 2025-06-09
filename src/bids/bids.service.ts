import {
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
import { bidsTable, BidType } from 'src/drizzle/schema/bids.schema';
import { UsersService } from 'src/users/users.service';
import { emailTokenTable } from 'src/drizzle/schema/email-tokens.schema';
import { EmailService } from 'src/email/email.service';
import { Money } from '../lib/money-value-object';
import { getHighestBid } from 'src/lib/get-highest-bid';
import { STATUS_CHOICES } from 'src/drizzle/schema/enums/advert.enum';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { PaymentsService } from 'src/payments/payments.service';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_KEY ?? '');

@Injectable()
export class BidsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(UsersService)
    private usersService: UsersService,
    @Inject(EmailService)
    private emailsService: EmailService,
    @Inject(PaymentsService)
    private paymentsService: PaymentsService,
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

    const dataAmountInCents = new Money(data.amount, 'USD', {
      isCents: true,
    }).getInCents();

    if (dbUser[0].emailVerified) {
      // Fetch advert and bids as nested objects
      const dbAdvert = await this.db
        .select({
          advert: advertsTable,
          bid: bidsTable,
        })
        .from(advertsTable)
        .where(eq(advertsTable.id, data.advertId))
        .leftJoin(bidsTable, eq(bidsTable.advertId, advertsTable.id));

      if (!dbAdvert.length) {
        throw new NotFoundException('Advertisement not found');
      }

      // Group all bids under the advert
      const { advert } = dbAdvert[0];
      const bids = dbAdvert.filter((row) => row.bid).map((row) => row.bid);

      const isAdvertExpired =
        advert?.endsAt && new Date(advert.endsAt).getTime() < Date.now();

      const isAdvertNotStarted =
        advert?.startsAt && new Date(advert.startsAt).getTime() > Date.now();

      if (isAdvertExpired) {
        throw new UnauthorizedException(
          'Cannot place a bid on an expired advertisement.',
        );
      }

      if (advert.status !== STATUS_CHOICES.ACTIVE) {
        throw new UnauthorizedException(
          'Cannot place a bid on an inactive advertisement.',
        );
      }

      if (isAdvertNotStarted) {
        throw new UnauthorizedException(
          'Cannot place a bid on an advertisement that has not started yet.',
        );
      }

      const highestBid = getHighestBid(bids);

      data.amount = dataAmountInCents;

      if (
        highestBid &&
        new Money(dataAmountInCents, 'USD', { isCents: true }).getInCents() >
          new Money(highestBid.amount, 'USD', { isCents: true }).getInCents()
      ) {
        const formattedHighestBidAmount = new Money(highestBid.amount, 'USD', {
          isCents: true,
        }).format();

        const formattedNewAmount = new Money(dataAmountInCents, 'USD', {
          isCents: true,
        }).format();

        await this.emailsService.sendOutbidEmail(highestBid.userId, {
          amount: dataAmountInCents,
          highestBid: formattedNewAmount,
          formattedAmount: formattedHighestBidAmount,
          websiteUrl: `https://www.deedbid.com/advert/${data.advertId}`,
        });
      }

      const insertBidData = {
        advertId: data.advertId,
        amount: dataAmountInCents,
        userId: userId,
      } as BidType;

      const existentBid = await this.db
        .select()
        .from(bidsTable)
        .where(
          and(
            eq(bidsTable.userId, userId),
            eq(bidsTable.advertId, data.advertId),
          ),
        );

      let newBid: BidType | null = null;

      if (existentBid.length) {
        await this.db
          .update(bidsTable)
          .set(insertBidData)
          .where(eq(bidsTable.id, existentBid[0].id));

        const updatedBids = await this.db
          .select()
          .from(bidsTable)
          .where(eq(bidsTable.id, existentBid[0].id));
        newBid = updatedBids[0] || null;
      } else {
        const insertedBids = await this.db
          .insert(bidsTable)
          .values(insertBidData)
          .returning();
        newBid = insertedBids[0] || null;
      }

      if (advert.initialDepositAmount > 0) {
        const price = await stripe.prices.create({
          currency: 'usd',
          unit_amount: advert.initialDepositAmount,
          product_data: {
            name: `Initial deposit for auction ${advert.title}`,
          },
        });

        const paymentLink = await stripe.paymentLinks.create({
          line_items: [
            {
              price: price.id,
              quantity: 1,
            },
          ],
        });

        await this.paymentsService.create({
          advertId: advert.id,
          amount: advert.initialDepositAmount,
          description: `Initial deposit for auction ${advert.title}`,
          url: paymentLink.url,
          userId,
        });
      }

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
          "Almost there! To add an document, please verify your email address. We've just sent you a verification email - be sure to check your inbox and spam folder. Thanks for helping us keep your account secure!",
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
            `Heads up! You'll need to verify your email before adding an document. We sent you a verification email ${sentMinutesAgo} minute${sentMinutesAgo === 1 ? '' : 's'} ago-please check your inbox and spam folder. Thanks for your patience!`,
          );
        } else {
          await sendVerificationEmail();
        }
      }
    }
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
