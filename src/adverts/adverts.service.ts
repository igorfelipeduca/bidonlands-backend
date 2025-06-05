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
import { and, eq, InferInsertModel, like, or, sql } from 'drizzle-orm';
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

    const amount = new Money(body.amount, 'USD');
    if (amount.getInCents() < 100) {
      throw new BadRequestException('The minimum accepted amount is $1');
    }

    const insertData = {
      ...data,
      amount: amount.getInCents(),
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
    // 1. Fetch adverts and their documents with a left join
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
        advertMap.set(advertId, { ...row.advert, documents: [] });
      }
      if (row.document) {
        advertMap.get(advertId).documents.push(row.document);
      }
    }

    // 3. Return as an array
    return Array.from(advertMap.values());
  }

  async findOne(id: number) {
    return await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, id));
  }

  async findOneBySlug(slug: string) {
    // Get advert with bids
    const advertWithBids = await this.db
      .select({ advert: advertsTable, bid: bidsTable })
      .from(advertsTable)
      .where(eq(advertsTable.slug, slug))
      .leftJoin(bidsTable, eq(advertsTable.id, bidsTable.advertId));

    // Get advert with documents
    const advertWithDocs = await this.db
      .select({ advert: advertsTable, document: documentsTable })
      .from(advertsTable)
      .where(eq(advertsTable.slug, slug))
      .leftJoin(documentsTable, eq(advertsTable.id, documentsTable.advertId));

    if (!advertWithBids.length) {
      return null;
    }

    // Combine into single response
    const advert = advertWithBids[0].advert;
    const bids = advertWithBids.filter((row) => row.bid).map((row) => row.bid);
    const documents = advertWithDocs
      .filter((row) => row.document)
      .map((row) => row.document);

    return {
      ...advert,
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
    if (dbAdvert[0].userId !== userId)
      throw new UnauthorizedException("You can not edit anyone else's avert.");

    let updateData = { ...data };

    if (typeof data.amount !== 'undefined') {
      const amount = new Money(data.amount, 'USD');
      updateData.amount = amount.getInCents();
      if (amount.getInCents() < 100) {
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
    if (dbAdvert[0].userId !== userId)
      throw new UnauthorizedException(
        "You can not delete anyone else's avert.",
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
    // 1. Busca de bids com CAST explícito para string
    const advertsWithBids = await this.db
      .select({ advert: advertsTable, bid: bidsTable })
      .from(advertsTable)
      .where(eq(advertsTable.status, STATUS_CHOICES.ACTIVE))
      .leftJoin(
        bidsTable,
        sql`CAST(${bidsTable.advertId} AS TEXT) = CAST(${advertsTable.id} AS TEXT)`,
      );

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
        bids: BidType[];
        documents: (typeof documentsTable.$inferSelect)[];
      }
    >();

    // Processamento de bids
    for (const { advert, bid } of advertsWithBids) {
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
        existingAdvert.bids.push(bid);
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

    return topAdverts[Math.floor(Math.random() * topAdverts.length)] ?? null;
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
