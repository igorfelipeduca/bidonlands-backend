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
import { PaymentsService } from 'src/payments/payments.service';
import { walletsTable } from 'src/drizzle/schema/wallets.schema';
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

      const userWallet = await this.db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, userId));

      if (!userWallet.length) {
        throw new UnauthorizedException(
          'You need to have a wallet to place a bid.',
        );
      }

      const userWalletBalance = new Money(userWallet[0].balance, 'USD', {
        isCents: true,
      });

      if (advert.minimumWalletBalance) {
        const minimumRequired = new Money(advert.minimumWalletBalance, 'USD', {
          isCents: true,
        });

        if (userWalletBalance.isLessThan(minimumRequired)) {
          throw new UnauthorizedException(
            `Insufficient wallet balance. You need at least ${minimumRequired.format()} but have ${userWalletBalance.format()}. Please deposit funds to your wallet.`,
          );
        }
      }

      if (advert.initialDepositAmount) {
        const depositRequired = new Money(advert.initialDepositAmount, 'USD', {
          isCents: true,
        });

        if (userWalletBalance.isLessThan(depositRequired)) {
          throw new UnauthorizedException(
            `Insufficient wallet balance for bid deposit. This auction requires a ${depositRequired.format()} deposit, but you have ${userWalletBalance.format()}. Please deposit funds to your wallet.`,
          );
        }
      }

      const highestBid = getHighestBid(bids);

      const newBidAmount = new Money(dataAmountInCents, 'USD', {
        isCents: true,
      });

      if (highestBid) {
        const currentHighestAmount = new Money(highestBid.amount, 'USD', {
          isCents: true,
        });

        const minimumIncrement = currentHighestAmount.percentage(5);
        const minimumNextBid = currentHighestAmount.add(minimumIncrement);

        if (newBidAmount.isLessThan(minimumNextBid)) {
          throw new UnauthorizedException(
            `Bid too low. Your bid of ${newBidAmount.format()} must be at least ${minimumNextBid.format()} (5% more than current highest bid of ${currentHighestAmount.format()}).`,
          );
        }

        if (newBidAmount.isGreaterThan(currentHighestAmount)) {
          await this.emailsService.sendOutbidEmail(highestBid.userId, {
            amount: dataAmountInCents,
            highestBid: newBidAmount.format(),
            formattedAmount: currentHighestAmount.format(),
            websiteUrl: `https://www.deedbid.com/advert/${data.advertId}`,
          });
        }
      } else {
        const advertMinBid = new Money(advert.minBidAmount, 'USD', {
          isCents: true,
        });

        if (newBidAmount.isLessThan(advertMinBid)) {
          throw new UnauthorizedException(
            `Bid too low. Your bid of ${newBidAmount.format()} must be at least ${advertMinBid.format()} (minimum bid for this auction).`,
          );
        }
      }

      data.amount = dataAmountInCents;

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
        await this.paymentsService.create({
          advertId: advert.id,
          amount: advert.initialDepositAmount,
          description: `Initial deposit for auction ${advert.title}`,
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
    const results = await this.db
      .select({
        bid: bidsTable,
        user: usersTable,
      })
      .from(bidsTable)
      .leftJoin(usersTable, eq(bidsTable.userId, usersTable.id));

    return results.map((result) => ({
      ...result.bid,
      user: result.user,
    }));
  }

  async findOne(id: number) {
    const dbBid = await this.db
      .select({
        bid: bidsTable,
        user: usersTable,
      })
      .from(bidsTable)
      .leftJoin(usersTable, eq(bidsTable.userId, usersTable.id))
      .where(eq(bidsTable.id, id));

    if (!dbBid.length) {
      return undefined;
    }

    return {
      ...dbBid[0].bid,
      user: dbBid[0].user,
    };
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

    const newBidAmount = new Money(data.amount, 'USD');
    const currentBidAmount = new Money(bid.amount, 'USD', { isCents: true });

    if (newBidAmount.isLessThan(currentBidAmount)) {
      throw new UnauthorizedException(
        `You cannot place a bid lower than the current bid. Your bid: ${newBidAmount.format()}, Current bid: ${currentBidAmount.format()}`,
      );
    }

    data.amount = new Money(data.amount, 'USD').getInCents();

    const updatedBid = await this.db.update(bidsTable).set(data).returning();

    return updatedBid;
  }

  async remove(id: number) {
    return `This action removes a #${id} bid`;
  }

  async getUserBids(userId: number) {
    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser.length) {
      throw new NotFoundException('User not found');
    }

    const bidsWithAdverts = await this.db
      .select({
        bid: bidsTable,
        advert: advertsTable,
      })
      .from(bidsTable)
      .innerJoin(advertsTable, eq(bidsTable.advertId, advertsTable.id))
      .where(eq(bidsTable.userId, userId));

    return bidsWithAdverts.map((row) => ({
      ...row.bid,
      advert: row.advert,
    }));
  }
}
