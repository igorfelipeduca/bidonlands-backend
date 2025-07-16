import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { eq, InferInsertModel } from 'drizzle-orm';
import {
  walletOperationsTable,
  walletsTable,
} from 'src/drizzle/schema/wallets.schema';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { CreateWalletOperationDto } from './dto/create-wallet-operation.dto';
import { Money } from '../lib/money-value-object';

@Injectable()
export class WalletsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createWalletDto: z.infer<typeof CreateWalletDto>) {
    const { data, error } = CreateWalletDto.safeParse(createWalletDto);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, createWalletDto.userId));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const insertObj = {
      userId: data.userId,
      billingAddress: data.billingAddress,
    } as InferInsertModel<typeof walletsTable>;

    return await this.db.insert(walletsTable).values(insertObj).returning();
  }

  async findAll() {
    return await this.db.select().from(walletsTable);
  }

  async findOne(id: number) {
    const walletWithOperations = await this.db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, id))
      .leftJoin(
        walletOperationsTable,
        eq(walletsTable.id, walletOperationsTable.walletId),
      );

    if (walletWithOperations.length === 0) {
      return null;
    }

    const wallet = walletWithOperations[0].wallets;
    const operations = walletWithOperations
      .filter(row => row.wallet_operations !== null)
      .map(row => row.wallet_operations)
      .reverse();

    return {
      ...wallet,
      operations: operations,
    };
  }

  async createWalletOperation(
    createWalletOperationDto: z.infer<typeof CreateWalletOperationDto>,
  ) {
    const { data, error } = CreateWalletOperationDto.safeParse(
      createWalletOperationDto,
    );

    if (error) {
      throw new BadRequestException(error.message);
    }

    const wallet = await this.db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, data.walletId));

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const currentBalance = new Money(wallet[0].balance, 'USD', { isCents: true });
    const operationAmount = new Money(data.amount, 'USD', { isCents: true });

    const newBalance =
      data.type === 'deposit'
        ? currentBalance.add(operationAmount)
        : currentBalance.subtract(operationAmount);

    if (data.type === 'withdraw' && newBalance.isNegative()) {
      throw new BadRequestException('Insufficient balance');
    }

    await this.db.insert(walletOperationsTable).values({
      walletId: data.walletId,
      balanceBefore: currentBalance.getInCents(),
      balanceAfter: newBalance.getInCents(),
      operationType: data.type === 'deposit' ? 'deposit' : 'withdraw',
      balanceChange: operationAmount.getInCents(),
    });

    const balanceUpdateObj = {
      balance: newBalance.getInCents(),
    } as Partial<InferInsertModel<typeof walletsTable>>;

    return await this.db
      .update(walletsTable)
      .set(balanceUpdateObj)
      .where(eq(walletsTable.id, data.walletId))
      .returning();
  }

  async update(id: number, updateWalletDto: z.infer<typeof UpdateWalletDto>) {
    const { data, error } = UpdateWalletDto.safeParse(updateWalletDto);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const wallet = await this.db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, id));

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const updateObj = {
      billingAddress: data.billingAddress ?? wallet[0].billingAddress,
    } as Partial<InferInsertModel<typeof walletsTable>>;

    return await this.db
      .update(walletsTable)
      .set(updateObj)
      .where(eq(walletsTable.id, id));
  }

  async remove(id: number) {
    return await this.db.delete(walletsTable).where(eq(walletsTable.id, id));
  }
}
