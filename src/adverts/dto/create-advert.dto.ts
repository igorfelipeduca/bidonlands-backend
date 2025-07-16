import { z } from 'zod';
import {
  SALES_TYPE_CHOICES,
  CATEGORY_CHOICES,
  CONDITION_CHOICES,
  INSPECTION_CHOICES,
  STATUS_CHOICES,
} from 'src/drizzle/schema/enums/advert.enum';

export const CreateAdvertDto = z.object({
  title: z
    .string({ error: 'Title is required' })
    .max(150, { error: 'Title must not exceed 150 characters' }),
  description: z.string({ error: 'Description is required' }).default(''),
  amount: z
    .number({ error: 'Amount is required' })
    .int({ error: 'Amount must be an integer in cents' })
    .min(100, { error: 'Amount must be at least 100 cents' }),
  salesType: z.enum(
    [
      SALES_TYPE_CHOICES.AUCTION_ONLINE,
      SALES_TYPE_CHOICES.AUCTION_LIVE,
      SALES_TYPE_CHOICES.FIXED_PRICE,
      // SALES_TYPE_CHOICES.BUY_NOW,
      // SALES_TYPE_CHOICES.AUCTION_SILENT,
      // SALES_TYPE_CHOICES.NEGOTIATED_SALE,
      // SALES_TYPE_CHOICES.PRIVATE_TREATY,
      // SALES_TYPE_CHOICES.SEALED_BID,
      // SALES_TYPE_CHOICES.DUTCH_AUCTION,
      // SALES_TYPE_CHOICES.REVERSE_AUCTION,
    ],
    { error: 'Invalid or missing sales type' },
  ),
  category: z.enum([CATEGORY_CHOICES.ANTIQUES, CATEGORY_CHOICES.REAL_ESTATE], {
    error: 'Invalid or missing category',
  }),
  condition: z.enum(
    [
      CONDITION_CHOICES.NEW,
      CONDITION_CHOICES.USED,
      CONDITION_CHOICES.RENOVATED,
      CONDITION_CHOICES.UNDER_CONSTRUCTION,
      CONDITION_CHOICES.OFF_PLAN,
      CONDITION_CHOICES.NEEDS_RENOVATION,
      CONDITION_CHOICES.UNFINISHED,
      CONDITION_CHOICES.MOVE_IN_READY,
      CONDITION_CHOICES.IN_GOOD_CONDITION,
      CONDITION_CHOICES.IN_POOR_CONDITION,
    ],
    { error: 'Invalid or missing condition' },
  ),
  inspectionBy: z.enum(
    [
      INSPECTION_CHOICES.ON_SITE_INSPECTION,
      INSPECTION_CHOICES.VIRTUAL_TOUR,
      INSPECTION_CHOICES.VIDEO_INSPECTION,
      INSPECTION_CHOICES.PHOTO_GALLERY,
    ],
    { error: 'Invalid or missing inspection type' },
  ),
  paymentInstructions: z
    .string({ error: 'Payment instructions must be a string' })
    .default(''),
  specialInstructions: z
    .string({ error: 'Special instructions must be a string' })
    .default(''),
  additionalInformation: z
    .string({ error: 'Additional information must be a string' })
    .default(''),
  referenceId: z
    .number({ error: 'Reference ID must be a number' })
    .int({ error: 'Reference ID must be an integer' })
    .default(0),
  administratorFee: z
    .number({ error: 'Administrator fee must be a number' })
    .int({ error: 'Administrator fee must be an integer in cents' })
    .min(100, { error: 'Administrator fee must be at least 100 cents' })
    .optional(),
  endsAt: z.coerce.date({ error: 'Invalid or missing end date' }),
  startsAt: z.coerce.date({ error: 'Invalid or missing start date' }),
  state: z
    .string({ error: 'State is required' })
    .max(100, { error: 'State must not exceed 100 characters' })
    .default(''),
  city: z
    .string({ error: 'City is required' })
    .max(100, { error: 'City must not exceed 100 characters' })
    .default(''),
  status: z
    .enum(
      [
        STATUS_CHOICES.ACTIVE,
        STATUS_CHOICES.INACTIVE,
        STATUS_CHOICES.PENDING,
        STATUS_CHOICES.SOLD,
        STATUS_CHOICES.EXPIRED,
        STATUS_CHOICES.CANCELLED,
        STATUS_CHOICES.ARCHIVED,
      ],
      { error: 'Invalid status' },
    )
    .optional(),
  userId: z
    .number({ error: 'User ID is required and must be a number' })
    .int({ error: 'User ID must be an integer' }),
  country: z
    .string({ error: 'Country is required' })
    .max(100, { error: 'Country must not exceed 100 characters' })
    .default(''),
  street: z
    .string({ error: 'Street is required' })
    .max(100, { error: 'Street must not exceed 100 characters' })
    .default(''),
  addressLine1: z
    .string({ error: 'Address line 1 is required' })
    .max(250, { error: 'Address line 1 must not exceed 250 characters' })
    .default(''),
  addressLine2: z
    .string({ error: 'Address line 2 must be a string' })
    .max(250, { error: 'Address line 2 must not exceed 250 characters' })
    .default(''),
  number: z
    .number({ error: 'Number must be a number' })
    .int({ error: 'Number must be an integer' })
    .optional(),
  zipCode: z
    .string({ error: 'Zip code is required' })
    .max(20, { error: 'Zip code must not exceed 20 characters' })
    .default(''),
  minBidAmount: z
    .number({ error: 'Min. bid amount must be a number' })
    .min(100, { error: 'The min. bid amount must be at least 1 dollar.' })
    .optional(),
  initialDepositAmount: z
    .number({ error: 'Initial deposit amount must be a number' })
    .min(100, { error: 'The min. bid amount must be at least 1 dollar.' })
    .optional(),
  reservePrice: z
    .number({ error: 'Reserve price must be a number' })
    .min(100, { error: 'The reserve price must be at least 1 dollar.' })
    .optional(),
  bidsUntilReservePrice: z
    .number({ error: 'Bids until reserve price must be a number' })
    .min(1, { error: 'The bids until reserve price must be at least 1.' })
    .optional(),
});
