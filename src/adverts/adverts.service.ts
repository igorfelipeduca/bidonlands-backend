import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAdvertDto } from './dto/create-advert.dto';
import { UpdateAdvertDto } from './dto/update-advert.dto';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import z, { prettifyError } from 'zod';
import { usersTable } from 'src/drizzle/schema/users.schema';
import {
  and,
  eq,
  InferInsertModel,
  like,
  sql,
  desc,
  inArray,
} from 'drizzle-orm';
import { advertsTable, AdvertType } from 'src/drizzle/schema/adverts.schema';
import { getDepositPercentage } from './utils/get-deposit-percentage';
import { Money } from '../lib/money-value-object';
import {
  SALES_TYPE_CHOICES,
  CATEGORY_CHOICES,
  ADS_TYPE_CHOICES,
  CONDITION_CHOICES,
  STATUS_CHOICES,
} from 'src/drizzle/schema/enums/advert.enum';
import { generateFakeAdvert } from './utils/generate-fake-advert';
import { EmailService } from 'src/email/email.service';
import { documentsTable } from 'src/drizzle/schema/documents.schema';
import { bidsTable, BidType } from 'src/drizzle/schema/bids.schema';
import slugify from 'slugify';

@Injectable()
export class AdvertsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(EmailService)
    private emailService: EmailService,
  ) {}

  private calculateIsReserveMet(advert: any, bids: BidType[]): any {
    if (!advert.reservePrice) {
      return advert;
    }

    const totalBidsAmount = bids
      .filter((bid) => bid.active)
      .reduce((sum, bid) => sum + (bid.amount || 0), 0);

    const isReserveMet = totalBidsAmount >= advert.reservePrice;
    const amountUntilReserve = isReserveMet ? 0 : advert.reservePrice - totalBidsAmount;

    return {
      ...advert,
      isReserveMet,
      amountUntilReserve,
    };
  }

  async create(body: z.infer<typeof CreateAdvertDto>, userId: number) {
    const { data, error } = CreateAdvertDto.safeParse(body);

    if (error) {
      throw new BadRequestException(prettifyError(error));
    }

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');
    if (body.userId !== dbUser[0].id)
      throw new UnauthorizedException(
        'You can not create advertisements for other users.',
      );

    const amount = new Money(data.amount, 'USD', { isCents: true });
    if (amount.getInCents() < 100) {
      throw new BadRequestException('The minimum accepted amount is $1');
    }

    if (data.initialDepositAmount) {
      const initialDeposit = new Money(data.initialDepositAmount, 'USD', {
        isCents: true,
      });
      if (initialDeposit.getInCents() < 100) {
        throw new BadRequestException('The minimum accepted amount is $1');
      }
    }

    const insertData = {
      ...data,
      depositPercentage: getDepositPercentage(data.state),
      slug: slugify(data.title),
    } as InferInsertModel<typeof advertsTable>;

    const newAdvert = await this.db
      .insert(advertsTable)
      .values(insertData)
      .returning();

    return newAdvert;
  }

  async findAll(page_size: number = 20, status?: string, search?: string) {
    // 1. Fetch adverts and their documents
    const advertsWithDocuments = await this.db
      .select({
        advert: advertsTable,
        document: documentsTable,
      })
      .from(advertsTable)
      .leftJoin(documentsTable, eq(advertsTable.id, documentsTable.advertId))
      .orderBy(advertsTable.id)
      .limit(page_size)
      .where(
        and(
          status ? eq(advertsTable.status, STATUS_CHOICES[status]) : undefined,
          search
            ? like(
                sql`LOWER(${advertsTable.title})`,
                `%${search.toLowerCase()}%`,
              )
            : undefined,
        ),
      );

    // 2. Group documents under their respective adverts
    const advertMap = new Map<number, any>();

    for (const row of advertsWithDocuments) {
      const advertId = row.advert.id;
      if (!advertMap.has(advertId)) {
        advertMap.set(advertId, {
          ...row.advert,
          documents: [],
          lastBid: null,
        });
      }
      if (row.document) {
        advertMap.get(advertId).documents.push(row.document);
      }
    }

    // 3. Get all bids with user data for each advert
    const adverts = Array.from(advertMap.values());
    const advertIds = adverts.map((advert) => advert.id);

    if (advertIds.length > 0) {
      const allBidsWithUsers = await this.db
        .select({
          bid: bidsTable,
          user: usersTable,
        })
        .from(bidsTable)
        .leftJoin(usersTable, eq(bidsTable.userId, usersTable.id))
        .where(inArray(bidsTable.advertId, advertIds))
        .orderBy(desc(bidsTable.createdAt));

      // Group all bids with user data by advertId
      const bidsByAdvertId = new Map();
      for (const row of allBidsWithUsers) {
        const bidWithUser = {
          ...row.bid,
          user: row.user,
        };
        if (!bidsByAdvertId.has(row.bid.advertId)) {
          bidsByAdvertId.set(row.bid.advertId, []);
        }
        bidsByAdvertId.get(row.bid.advertId).push(bidWithUser);
      }

      // Add latest bid with user data and calculate isReserveMet for each advert
      for (let i = 0; i < adverts.length; i++) {
        const advertBids = bidsByAdvertId.get(adverts[i].id) || [];
        const activeBids = advertBids.filter((bid) => bid.active);

        if (activeBids.length > 0) {
          adverts[i].lastBid = activeBids[0];
        }

        adverts[i] = this.calculateIsReserveMet(adverts[i], advertBids);
      }
    }

    return adverts;
  }

  async findOne(id: number) {
    const advert = await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, id));

    if (!advert.length) {
      return advert;
    }

    const bids = await this.db
      .select()
      .from(bidsTable)
      .where(eq(bidsTable.advertId, id));

    return [this.calculateIsReserveMet(advert[0], bids)];
  }

  async findOneBySlug(slug: string) {
    // Get advert with bids and user data
    const advertWithBidsAndUsers = await this.db
      .select({
        advert: advertsTable,
        bid: bidsTable,
        user: usersTable
      })
      .from(advertsTable)
      .where(eq(advertsTable.slug, slug))
      .leftJoin(bidsTable, eq(advertsTable.id, bidsTable.advertId))
      .leftJoin(usersTable, eq(bidsTable.userId, usersTable.id));

    // Get advert with documents
    const advertWithDocs = await this.db
      .select({ advert: advertsTable, document: documentsTable })
      .from(advertsTable)
      .where(eq(advertsTable.slug, slug))
      .leftJoin(documentsTable, eq(advertsTable.id, documentsTable.advertId));

    if (!advertWithBidsAndUsers.length) {
      return null;
    }

    // Combine into single response
    const advert = advertWithBidsAndUsers[0].advert;
    const bids = advertWithBidsAndUsers
      .filter((row) => row.bid)
      .map((row) => ({
        ...row.bid,
        user: row.user,
      }));
    const documents = advertWithDocs
      .filter((row) => row.document)
      .map((row) => row.document);

    const advertWithReserve = this.calculateIsReserveMet(advert, bids);

    return {
      ...advertWithReserve,
      bids,
      documents,
    };
  }

  async update(
    id: number,
    updateAdvertDto: z.infer<typeof UpdateAdvertDto>,
    userId: number,
  ) {
    const { data, error } = UpdateAdvertDto.safeParse(updateAdvertDto);

    if (error) {
      throw new BadRequestException(prettifyError(error));
    }

    console.log({ data });

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');

    const dbAdvert = await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, id));

    if (!dbAdvert.length) throw new NotFoundException('Advert not found');
    if (dbAdvert[0].userId !== userId && dbUser[0].role !== 'admin')
      throw new UnauthorizedException("You can not edit anyone else's advert.");

    let updateData = { ...data };

    if (typeof data.amount !== 'undefined') {
      const amount = new Money(data.amount, 'USD', { isCents: true });
      if (amount.getInCents() < 100) {
        throw new BadRequestException('The minimum accepted amount is $1');
      }
    }

    if (typeof data.initialDepositAmount !== 'undefined') {
      const initialDeposit = new Money(data.initialDepositAmount, 'USD', {
        isCents: true,
      });
      if (initialDeposit.getInCents() < 100) {
        throw new BadRequestException('The minimum accepted amount is $1');
      }
    }

    return await this.db
      .update(advertsTable)
      .set(updateData)
      .where(eq(advertsTable.id, id))
      .returning();
  }

  async remove(id: number, userId: number) {
    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser) throw new UnauthorizedException('Invalid user');

    const dbAdvert = await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, id));

    if (!dbAdvert.length) throw new NotFoundException('Advert not found');
    if (dbAdvert[0].userId !== userId && dbUser[0].role !== 'admin')
      throw new UnauthorizedException(
        "You can not delete anyone else's advert.",
      );

    return await this.db.delete(advertsTable).where(eq(advertsTable.id, id));
  }

  async seedAdverts(userId: number, quantity: number) {
    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    console.log({ user: dbUser[0] });

    if (!dbUser.length) {
      throw new BadRequestException('No user found for this auth token');
    }

    const allowedList = process.env.ADMIN_EMAILS.split(',');

    if (!allowedList.includes(dbUser[0].email)) {
      throw new UnauthorizedException("You can't perform this action");
    }

    const adverts = Array.from({ length: quantity }, () =>
      generateFakeAdvert({
        userId,
        salesTypeChoices: SALES_TYPE_CHOICES,
        categoryChoices: CATEGORY_CHOICES,
        adsTypeChoices: ADS_TYPE_CHOICES,
        conditionChoices: CONDITION_CHOICES,
        statusChoices: STATUS_CHOICES,
      }),
    );

    let inserted: AdvertType[] | null = null;
    try {
      inserted = await this.db.insert(advertsTable).values(adverts).returning();
    } catch (error) {
      console.error('Error inserting adverts:', {
        error: error?.message,
        stack: error?.stack,
        adverts,
      });
      throw error;
    }
    return inserted;
  }

  async endAdvert(advertId: number) {
    const dbAdvert = await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, advertId));

    if (!dbAdvert) {
      throw new NotFoundException('Advert not found');
    }

    const updateData: Partial<AdvertType> = {
      endsAt: new Date(),
      status: STATUS_CHOICES.SOLD,
    };

    return await this.db
      .update(advertsTable)
      .set(updateData)
      .where(eq(advertsTable.id, advertId));
  }

  async announceWinner(advertId: number, userId: number, bidAmount: number) {
    const dbAdvert = await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, advertId));

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbAdvert.length) {
      throw new NotFoundException('Advert not found');
    }

    if (!dbUser.length) {
      throw new NotFoundException('User not found');
    }

    const advertUpdate: Partial<AdvertType> = { status: STATUS_CHOICES.SOLD };

    await this.db
      .update(advertsTable)
      .set(advertUpdate)
      .where(eq(advertsTable.id, advertId));

    const moneyBidAmount = new Money(bidAmount, 'USD', {
      isCents: true,
    });

    await this.emailService.sendBidWinnerEmail(
      dbUser[0],
      moneyBidAmount.format(),
      dbAdvert[0],
    );
  }

  async getFeaturedAdvert() {
    // 1. Busca de bids com dados do usuário
    const advertsWithBidsAndUsers = await this.db
      .select({
        advert: advertsTable,
        bid: bidsTable,
        user: usersTable
      })
      .from(advertsTable)
      .where(eq(advertsTable.status, STATUS_CHOICES.ACTIVE))
      .leftJoin(
        bidsTable,
        sql`CAST(${bidsTable.advertId} AS TEXT) = CAST(${advertsTable.id} AS TEXT)`,
      )
      .leftJoin(usersTable, eq(bidsTable.userId, usersTable.id));

    // 2. Busca de documentos
    const advertsWithDocuments = await this.db
      .select({ advert: advertsTable, document: documentsTable })
      .from(advertsTable)
      .where(eq(advertsTable.status, STATUS_CHOICES.ACTIVE))
      .leftJoin(
        documentsTable,
        sql`CAST(${documentsTable.advertId} AS TEXT) = CAST(${advertsTable.id} AS TEXT)`,
      );

    // 3. Agrupamento com verificação de tipos
    const advertsMap = new Map<
      string,
      AdvertType & {
        bids: (BidType & { user: any })[];
        documents: (typeof documentsTable.$inferSelect)[];
      }
    >();

    // Processamento de bids com dados do usuário
    for (const { advert, bid, user } of advertsWithBidsAndUsers) {
      const advertId = advert.id.toString();
      if (!advertsMap.has(advertId)) {
        advertsMap.set(advertId, {
          ...advert,
          bids: [],
          documents: [],
        });
      }
      const existingAdvert = advertsMap.get(advertId)!;
      if (
        bid &&
        !existingAdvert.bids.some((b) => b.id.toString() === bid.id.toString())
      ) {
        existingAdvert.bids.push({
          ...bid,
          user,
        });
      }
    }

    // Processamento de documentos
    for (const { advert, document } of advertsWithDocuments) {
      const advertId = advert.id.toString();
      if (advertsMap.has(advertId) && document) {
        const existingAdvert = advertsMap.get(advertId)!;
        if (
          !existingAdvert.documents.some(
            (d) => d.id.toString() === document.id.toString(),
          )
        ) {
          existingAdvert.documents.push(document);
        }
      }
    }

    const advertsWithBidsAndDocuments = Array.from(advertsMap.values());

    // 4. Filtragem e seleção corrigidas
    const validAdverts = advertsWithBidsAndDocuments.filter(
      (ad) => ad.bids.length > 0,
    );

    if (validAdverts.length === 0) return null;

    const maxBids = Math.max(...validAdverts.map((ad) => ad.bids.length));
    const topAdverts = validAdverts.filter((ad) => ad.bids.length === maxBids);

    const selectedAdvert =
      topAdverts[Math.floor(Math.random() * topAdverts.length)] ?? null;

    if (selectedAdvert) {
      return this.calculateIsReserveMet(selectedAdvert, selectedAdvert.bids);
    }

    return null;
  }

  async likeAdvert(advertId: number, userId: number) {
    const dbAdvert = await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, advertId));

    if (!dbAdvert.length) {
      throw new Error('Advert not found');
    }

    const insertData = {
      likedBy: [...dbAdvert[0].likedBy, userId],
    } as Partial<InferInsertModel<typeof advertsTable>>;

    return await this.db
      .update(advertsTable)
      .set(insertData)
      .where(eq(advertsTable.id, advertId));
  }
}
