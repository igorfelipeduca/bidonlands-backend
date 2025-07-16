import { z } from 'zod';

export const CreateWalletOperationDto = z.object({
  walletId: z.number(),
  amount: z.number(),
  type: z.enum(['deposit', 'withdraw']),
});
