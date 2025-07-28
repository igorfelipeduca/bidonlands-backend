import { z } from 'zod';

export const RequestWithdrawalDto = z.object({
  amount: z.number().positive(),
});

export const ManageWithdrawalRequestDto = z.object({
  status: z.enum(['approved', 'finished', 'pending', 'denied']),
});
