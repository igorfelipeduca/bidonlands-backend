import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import z from 'zod';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/drizzle/schema';
import { usersTable, UserType } from 'src/drizzle/schema/users.schema';
import { eq, InferInsertModel } from 'drizzle-orm';
import { Money } from 'src/lib/money-value-object';
import { paymentsTable } from 'src/drizzle/schema/payments.schema';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(EmailService)
    private emailService: EmailService,
  ) {}

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

    const amount = new Money(data.amount, 'USD');

    if (amount.getInCents() < 100) {
      throw new BadRequestException('Amount must be greater than 1 usd');
    }

    const insertData = {
      ...body,
      amount: amount.getInCents(),
    } as InferInsertModel<typeof paymentsTable>;

    const createdPayment = await this.db
      .insert(paymentsTable)
      .values(insertData);

    await this.notifyPaymentLinkCreation(
      amount.getInCents(),
      dbUser[0],
      body.url,
    );

    return createdPayment;
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
}
