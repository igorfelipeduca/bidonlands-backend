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
import { eq, InferInsertModel } from 'drizzle-orm';
import { advertsTable } from 'src/drizzle/schema/adverts.schema';
import { getDepositPercentage } from './utils/get-deposit-percentage';
import { Money } from '../lib/money-value-object';
import { faker } from '@faker-js/faker';
import {
  SALES_TYPE_CHOICES,
  CATEGORY_CHOICES,
  ADS_TYPE_CHOICES,
  CONDITION_CHOICES,
  INSPECTION_CHOICES,
  STATUS_CHOICES,
} from 'src/drizzle/schema/enums/advert.enum';

@Injectable()
export class AdvertsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
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
    } as InferInsertModel<typeof advertsTable>;

    const newAdvert = await this.db
      .insert(advertsTable)
      .values(insertData)
      .returning();

    return newAdvert;
  }

  async findAll(page_size: number = 20) {
    return await this.db
      .select()
      .from(advertsTable)
      .orderBy(advertsTable.id)
      .limit(page_size);
  }

  async findOne(id: number) {
    return await this.db
      .select()
      .from(advertsTable)
      .where(eq(advertsTable.id, id));
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

    if (dbUser[0].email !== 'igorducca@gmail.com') {
      throw new UnauthorizedException("You can't perform this action");
    }

    const adverts = [];
    // Use correct enum codes for all varchar(2) fields, and ensure all required fields are present
    // See schema: salesType, category, adsType, condition, inspectionBy, status
    // Also, depositPercentage is required

    // Enum codes (from your schema/enums):
    // salesType: 'AO', 'AL', 'AS', 'FP', 'NS', 'BN', 'PT', 'SB', 'DA', 'RA'
    // category: 'AN', 'RE'
    // adsType: 'SC', 'BN', 'MO', 'CA', 'SL', 'FL', 'AA'
    // condition: 'NW', 'US', 'RN', 'UC', 'OP', 'NR', 'UF', 'MR', 'GC', 'PC'
    // inspectionBy: 'OS', 'VT', 'VI', 'PG'
    // status: 'AC', 'IN', 'PE', 'SO', 'EX', 'CA', 'AR'

    for (let i = 0; i < quantity; i++) {
      // US state abbreviations for 2-char state field
      const US_STATES = [
        'AL',
        'AK',
        'AZ',
        'AR',
        'CA',
        'CO',
        'CT',
        'DE',
        'FL',
        'GA',
        'HI',
        'ID',
        'IL',
        'IN',
        'IA',
        'KS',
        'KY',
        'LA',
        'ME',
        'MD',
        'MA',
        'MI',
        'MN',
        'MS',
        'MO',
        'MT',
        'NE',
        'NV',
        'NH',
        'NJ',
        'NM',
        'NY',
        'NC',
        'ND',
        'OH',
        'OK',
        'OR',
        'PA',
        'RI',
        'SC',
        'SD',
        'TN',
        'TX',
        'UT',
        'VT',
        'VA',
        'WA',
        'WV',
        'WI',
        'WY',
      ];
      const stateValue =
        US_STATES[Math.floor(Math.random() * US_STATES.length)];

      // Helper to get random enum value
      const randomEnumValue = (enumObj: any) => {
        const values = Object.values(enumObj);
        return values[Math.floor(Math.random() * values.length)];
      };

      const salesType = randomEnumValue(SALES_TYPE_CHOICES);
      const category = randomEnumValue(CATEGORY_CHOICES);
      const adsType = randomEnumValue(ADS_TYPE_CHOICES);
      const condition = randomEnumValue(CONDITION_CHOICES);
      const inspectionBy = randomEnumValue(INSPECTION_CHOICES);
      const status = randomEnumValue(STATUS_CHOICES);

      // depositPercentage is required
      const depositPercentage = getDepositPercentage(stateValue);

      // userHighestBidId must be a valid user id or null (to avoid FK violation)
      // For seed, set to null
      const advert = {
        title: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        amount: faker.number.int({ min: 100, max: 1000000 }),
        salesType,
        category,
        adsNumber: faker.number.int({ min: 1, max: 99 }),
        adsType,
        condition,
        inspectionBy,
        paymentInstructions: faker.lorem.sentence(),
        specialInstructions: faker.lorem.sentence(),
        additionalInformation: faker.lorem.sentence(),
        referenceId: faker.number.int({ min: 1, max: 999999 }),
        administratorFee: faker.number.int({ min: 100, max: 10000 }),
        expiresAt: faker.date.soon({ days: 90 }),
        state: stateValue,
        city: faker.location.city(),
        status,
        userId: userId,
        country: faker.location.country(),
        street: faker.location.street(),
        addressLine1: faker.location.streetAddress(),
        addressLine2: faker.location.secondaryAddress(),
        number: faker.number.int({ min: 1, max: 9999 }),
        zipCode: faker.location.zipCode(),
        currentAmount: faker.number.int({ min: 100, max: 1000000 }),
        highestBid: faker.number.int({ min: 100, max: 1000000 }),
        userHighestBidId: null,
        slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
        minBidAmount: faker.number.int({ min: 100, max: 100000 }),
        depositPercentage,
      };
      adverts.push(advert);
    }
    let inserted;
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
}
