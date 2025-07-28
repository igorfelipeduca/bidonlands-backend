import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import z from 'zod';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import { usersTable, UserType } from 'src/drizzle/schema/users.schema';
import { and, eq, InferInsertModel } from 'drizzle-orm';
import { Money } from 'src/lib/money-value-object';
import { paymentsTable } from 'src/drizzle/schema/payments.schema';
import { EmailService } from 'src/email/email.service';
import { PAYMENT_STATUS } from 'src/drizzle/schema/enums/payment-status.enum';
import Stripe from 'stripe';
import { walletsTable } from 'src/drizzle/schema/wallets.schema';
import { WalletsService } from 'src/wallets/wallets.service';

const stripe = new Stripe(process.env.STRIPE_KEY);

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(EmailService)
    private emailService: EmailService,
    @Inject(forwardRef(() => WalletsService))
    private walletsService: WalletsService,
  ) {}

  async createDbPayment(
    body: z.infer<typeof CreatePaymentDto>,
    user: UserType,
    transactionType: string,
    walletId: number,
  ) {
    const amount = new Money(body.amount, 'USD', { isCents: true });

    if (amount.getInCents() < 100) {
      throw new BadRequestException('Amount must be greater than 1 usd');
    }

    const insertData = {
      ...body,
      amount: amount.getInCents(),
      walletId,
    } as InferInsertModel<typeof paymentsTable>;

    const createdPayment = await this.db
      .insert(paymentsTable)
      .values(insertData)
      .returning();

    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: amount.getInCents(),
      product_data: {
        name: body.description,
      },
    });

    // const paymentLink = await stripe.paymentLinks.create({
    //   line_items: [
    //     {
    //       price: price.id,
    //       quantity: 1,
    //     },
    //   ],
    //   metadata: {
    //     userId: user.id.toString(),
    //     paymentId: createdPayment[0].id.toString(),
    //     transactionType,
    //   },
    // });

    const checkoutSession = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: 'payment',
      success_url: `https://duca.dev/payment/success`,
      cancel_url: `https://duca.dev/payment/cancel`,
      customer_email: user.email,
    });

    console.log({ checkoutSession, parsedUrl: checkoutSession.url });

    // const parsedUrl = `${checkoutSession.url}?prefilled_email=${user.email}`;
    const parsedUrl = checkoutSession.url;

    const updateData = {
      url: parsedUrl,
    } as Partial<InferInsertModel<typeof paymentsTable>>;

    await this.db
      .update(paymentsTable)
      .set(updateData)
      .where(eq(paymentsTable.id, createdPayment[0].id));

    await this.notifyPaymentLinkCreation(amount.getInCents(), user, parsedUrl);

    createdPayment[0].url = parsedUrl;

    return createdPayment[0];
  }

  async create(body: z.infer<typeof CreatePaymentDto>) {
    const { data, error } = CreatePaymentDto.safeParse(body);

    if (error) {
      throw new BadRequestException(z.prettifyError(error));
    }

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, body.userId));

    if (!dbUser.length) throw new NotFoundException('User not found');

    const dbWallet = await this.db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, body.userId));

    if (!dbWallet.length) throw new NotFoundException('Wallet not found');

    const existentPayment = await this.db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.amount, body.amount),
          eq(paymentsTable.userId, body.userId),
          eq(paymentsTable.status, PAYMENT_STATUS.PENDING),
        ),
      );

    if (existentPayment.length) {
      const isPaymentExpired =
        new Date(existentPayment[existentPayment.length - 1].createdAt) <
        new Date(Date.now() - 1000 * 60 * 3);

      if (isPaymentExpired) {
        return await this.createDbPayment(
          data,
          dbUser[0],
          data.transactionType,
          dbWallet[0].id,
        );
      }

      return existentPayment[0];
    }

    return await this.createDbPayment(
      data,
      dbUser[0],
      data.transactionType,
      dbWallet[0].id,
    );
  }

  async notifyPaymentLinkCreation(
    amountInCents: number,
    user: UserType,
    paymentUrl: string,
  ) {
    await this.emailService.sendPaymentLinkCreationEmail(
      user.id,
      amountInCents,
      paymentUrl,
    );
  }

  async findAll() {
    const payments = await this.db
      .select()
      .from(paymentsTable)
      .orderBy(paymentsTable.createdAt);

    return payments;
  }

  async findOne(id: number) {
    const payment = await this.db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id));

    if (!payment.length) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment[0];
  }

  async update(id: number, updatePaymentDto: z.infer<typeof UpdatePaymentDto>) {
    const { data, error } = UpdatePaymentDto.safeParse(updatePaymentDto);

    if (error) {
      throw new BadRequestException(z.prettifyError(error));
    }

    const payment = await this.findOne(id);

    const updatedPayment = await this.db
      .update(paymentsTable)
      .set({
        ...data,
      })
      .where(eq(paymentsTable.id, id))
      .returning();

    return updatedPayment[0];
  }

  async remove(id: number) {
    const payment = await this.findOne(id);

    await this.db.delete(paymentsTable).where(eq(paymentsTable.id, id));

    return { message: `Payment with ID ${id} has been deleted` };
  }

  async processPayment(email: string, amount: number) {
    console.log({ email, amount });

    const dbUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!dbUser.length) throw new NotFoundException('User not found');

    const userPayments = await this.db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.userId, dbUser[0].id));

    if (!userPayments.length) throw new NotFoundException('Payment not found');

    const payment = userPayments.find(
      (p) => p.amount === amount && p.status === PAYMENT_STATUS.PENDING,
    );

    const paymentUpdateData = {
      status: PAYMENT_STATUS.APPROVED,
    } as Partial<InferInsertModel<typeof paymentsTable>>;

    await this.walletsService.createWalletOperation({
      walletId: payment.walletId,
      amount: amount,
      type: 'deposit',
    });

    return await this.db
      .update(paymentsTable)
      .set(paymentUpdateData)
      .where(eq(paymentsTable.id, payment.id));
  }
}
