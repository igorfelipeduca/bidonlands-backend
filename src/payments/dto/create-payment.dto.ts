import z from 'zod';

export const CreatePaymentDto = z.object({
  description: z.string().max(150).default(''),
  amount: z.number().int().optional(),
  url: z.string().max(250).default(''),
  userId: z.number().int(),
  advertId: z.number().int().optional(),
  status: z.number().int().default(0),
});
