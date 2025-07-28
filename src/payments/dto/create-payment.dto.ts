import z from 'zod';
import { PAYMENT_STATUS } from 'src/drizzle/schema/enums/payment-status.enum';

export const CreatePaymentDto = z.object({
  description: z.string().max(150).default(''),
  amount: z.number().int().optional(),
  userId: z.number().int(),
  advertId: z.number().int().optional(),
  walletId: z.number().int().optional(),
  status: z.number().int().default(PAYMENT_STATUS.PENDING),
  transactionType: z.string().default(''),
});
