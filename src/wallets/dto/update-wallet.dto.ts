import { z } from 'zod';

export const UpdateWalletDto = z.object({
  billingAddress: z.string().optional(),
});
