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

  async findAll() {
    return await this.db.select().from(advertsTable);
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
}
