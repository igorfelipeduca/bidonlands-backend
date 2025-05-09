import z from 'zod';

export const CreateBidDto = z.object({
  advertId: z.number({ error: 'Advert id must be a number' }),
  amount: z
    .number({ error: 'Amount must be a number' })
    .int({ message: 'Amount must be an integer in cents' })
    .min(100, {
      error: 'The minimum amount for a bid is 100 cents',
    }),
});
