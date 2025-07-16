import { z } from 'zod';

export const CreateWalletDto = z.object({
  userId: z.number(),
  billingAddress: z.string().optional(),
});
