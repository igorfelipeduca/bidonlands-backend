import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { z } from 'zod';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import { usersTable, UserType } from 'src/drizzle/schema/users.schema';
import { eq, InferInsertModel } from 'drizzle-orm';
import {
  walletOperationsTable,
  walletsTable,
} from 'src/drizzle/schema/wallets.schema';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { CreateWalletOperationDto } from './dto/create-wallet-operation.dto';
import { Money } from '../lib/money-value-object';
import Stripe from 'stripe';
import { PaymentsService } from 'src/payments/payments.service';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { withdrawalRequestsTable } from 'src/drizzle/schema/withdrawal-requests.schema';
import { EmailService } from 'src/email/email.service';

const stripe = new Stripe(process.env.STRIPE_KEY);

@Injectable()
export class WalletsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    @Inject(EmailService)
    private emailService: EmailService,
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
      .filter((row) => row.wallet_operations !== null)
      .map((row) => row.wallet_operations)
      .reverse();

    return {
      ...wallet,
      operations: operations,
    };
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

  async createWalletOperation(
    createWalletOperationDto: z.infer<typeof CreateWalletOperationDto>,
    userId: number,
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
      .where(eq(walletsTable.userId, userId));

    if (!wallet || wallet.length === 0) {
      throw new NotFoundException('Wallet not found');
    }

    const currentBalance = wallet[0].balance;
    const operationAmount =
      data.type === 'withdraw' ? -data.amount : data.amount;

    if (data.type === 'withdraw' && currentBalance < data.amount) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    const newBalance = currentBalance + operationAmount;

    return await this.db.transaction(async (tx) => {
      const walletOperationInsertData = {
        balanceChange: operationAmount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        operationType: data.type,
        walletId: wallet[0].id,
      } as InferInsertModel<typeof walletOperationsTable>;

      const [operation] = await tx
        .insert(walletOperationsTable)
        .values(walletOperationInsertData)
        .returning();

      const walletUpdateData = {
        balance: newBalance,
      } as Partial<InferInsertModel<typeof walletsTable>>;

      await tx
        .update(walletsTable)
        .set(walletUpdateData)
        .where(eq(walletsTable.userId, userId));

      return operation;
    });
  }

  async createDepositPaymentLink(
    amount: number,
    userId: number,
    origin?: string,
  ) {
    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const userWallet = await this.db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId));

    if (!userWallet) {
      throw new NotFoundException('User wallet not found');
    }

    const depositAmount = new Money(amount, 'USD', { isCents: true });

    const payment = await this.paymentsService.create({
      amount: depositAmount.getInCents(),
      userId,
      description: `Deposit of ${depositAmount.format()} USD to ${dbUser[0].firstName} ${dbUser[0].lastName}'s wallet`,
      origin,
    });

    await this.emailService.sendPaymentLinkCreationEmail(
      userId,
      depositAmount.getInCents(),
      payment.url,
    );

    return payment;
  }

  async requestWithdrawal(
    requestWithdrawalDto: z.infer<typeof RequestWithdrawalDto>,
    userId: number,
  ) {
    const { data, error } =
      RequestWithdrawalDto.safeParse(requestWithdrawalDto);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const userWallet = await this.db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId));

    if (!userWallet) {
      throw new NotFoundException('User wallet not found');
    }

    if (userWallet[0].balance < data.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const withdrawalInsertData = {
      userId: userId,
      status: 'pending',
      amount: data.amount,
    } as InferInsertModel<typeof withdrawalRequestsTable>;

    const withdrawalRequest = await this.db
      .insert(withdrawalRequestsTable)
      .values(withdrawalInsertData)
      .returning();

    return withdrawalRequest;
  }

  async manageWithdrawalRequest(withdrawalRequestId: number, status: string) {
    const withdrawalRequest = await this.db
      .select()
      .from(withdrawalRequestsTable)
      .where(eq(withdrawalRequestsTable.id, withdrawalRequestId));

    if (!withdrawalRequest || withdrawalRequest.length === 0) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (
      withdrawalRequest[0].status === 'denied' ||
      withdrawalRequest[0].status === 'finished'
    ) {
      throw new BadRequestException('Withdrawal request already processed');
    }

    if (status === 'approved') {
      const dbUser = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, withdrawalRequest[0].userId));

      if (!dbUser) {
        throw new NotFoundException('User not found');
      }

      const userWallet = await this.db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, withdrawalRequest[0].userId));

      if (!userWallet) {
        throw new NotFoundException('User wallet not found');
      }

      const walletOperationInsertData = {
        balanceChange: -withdrawalRequest[0].amount,
        balanceBefore: userWallet[0].balance,
        balanceAfter: userWallet[0].balance - withdrawalRequest[0].amount,
        operationType: 'withdrawal',
        walletId: userWallet[0].id,
      } as InferInsertModel<typeof walletOperationsTable>;

      await this.db
        .insert(walletOperationsTable)
        .values(walletOperationInsertData);

      const walletInsertData = {
        balance: userWallet[0].balance - withdrawalRequest[0].amount,
      } as Partial<InferInsertModel<typeof walletsTable>>;

      await this.db
        .update(walletsTable)
        .set(walletInsertData)
        .where(eq(walletsTable.id, userWallet[0].id));

      const updateData = {
        status: 'finished',
      } as Partial<InferInsertModel<typeof withdrawalRequestsTable>>;

      return await this.db
        .update(withdrawalRequestsTable)
        .set(updateData)
        .where(eq(withdrawalRequestsTable.id, withdrawalRequestId))
        .returning();
    }

    const updateData = {
      status,
    } as Partial<InferInsertModel<typeof withdrawalRequestsTable>>;

    return await this.db
      .update(withdrawalRequestsTable)
      .set(updateData)
      .where(eq(withdrawalRequestsTable.id, withdrawalRequestId))
      .returning();
  }
}
