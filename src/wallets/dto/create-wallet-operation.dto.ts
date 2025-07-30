import { z } from 'zod';

export const CreateWalletOperationDto = z.object({
  amount: z.number(),
  type: z.enum(['deposit', 'withdraw']),
});
