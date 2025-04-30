import {
  integer,
  pgTable,
  varchar,
  text,
  decimal,
  timestamp,
} from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';
import {
  SALES_TYPE_CHOICES,
  CATEGORY_CHOICES,
  ADS_TYPE_CHOICES,
  CONDITION_CHOICES,
  INSPECTION_CHOICES,
  STATUS_CHOICES,
} from './enums/advert.enum';

export const advertsTable = pgTable('adverts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 150 }).notNull(),
  description: text('description').default(''),
  amount: integer().default(100),
  salesType: varchar({
    length: 2,
    enum: [
      SALES_TYPE_CHOICES.AUCTION_ONLINE,
      SALES_TYPE_CHOICES.AUCTION_LIVE,
      SALES_TYPE_CHOICES.AUCTION_SILENT,
      SALES_TYPE_CHOICES.FIXED_PRICE,
      SALES_TYPE_CHOICES.NEGOTIATED_SALE,
      SALES_TYPE_CHOICES.BUY_NOW,
      SALES_TYPE_CHOICES.PRIVATE_TREATY,
      SALES_TYPE_CHOICES.SEALED_BID,
      SALES_TYPE_CHOICES.DUTCH_AUCTION,
      SALES_TYPE_CHOICES.REVERSE_AUCTION,
    ],
  })
    .notNull()
    .default(SALES_TYPE_CHOICES.AUCTION_ONLINE),
  category: varchar({
    length: 2,
    enum: [CATEGORY_CHOICES.ANTIQUES, CATEGORY_CHOICES.REAL_ESTATE],
  }).notNull(),
  adsNumber: integer(),
  adsType: varchar({
    length: 2,
    enum: [
      ADS_TYPE_CHOICES.SUBJECT_TO_SELLER_CONFIRMATION,
      ADS_TYPE_CHOICES.BUY_NOW,
      ADS_TYPE_CHOICES.MAKE_OFFER,
      ADS_TYPE_CHOICES.CLASSIFIED_AD,
      ADS_TYPE_CHOICES.SPONSORED_LISTING,
      ADS_TYPE_CHOICES.FEATURED_LISTING,
      ADS_TYPE_CHOICES.AUCTION_AD,
    ],
  })
    .notNull()
    .default(ADS_TYPE_CHOICES.BUY_NOW),
  condition: varchar({
    length: 2,
    enum: [
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
  })
    .notNull()
    .default(CONDITION_CHOICES.NEW),
  inspectionBy: varchar({
    length: 2,
    enum: [
      INSPECTION_CHOICES.ON_SITE_INSPECTION,
      INSPECTION_CHOICES.VIRTUAL_TOUR,
      INSPECTION_CHOICES.VIDEO_INSPECTION,
      INSPECTION_CHOICES.PHOTO_GALLERY,
    ],
  })
    .notNull()
    .default(INSPECTION_CHOICES.ON_SITE_INSPECTION),
  paymentInstructions: text().default(''),
  specialInstructions: text().default(''),
  additionalInformation: text().default(''),
  referenceId: integer().default(0),
  administratorFee: integer(),
  expiresAt: timestamp('expiresAt', { mode: 'date' }).notNull(),
  state: varchar({ length: 100 }).notNull().default(''),
  city: varchar({ length: 100 }).notNull().default(''),
  status: varchar({
    length: 2,
    enum: [
      STATUS_CHOICES.ACTIVE,
      STATUS_CHOICES.INACTIVE,
      STATUS_CHOICES.PENDING,
      STATUS_CHOICES.SOLD,
      STATUS_CHOICES.EXPIRED,
      STATUS_CHOICES.CANCELLED,
      STATUS_CHOICES.ARCHIVED,
    ],
  })
    .notNull()
    .default(STATUS_CHOICES.ACTIVE),
  userId: integer()
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  country: varchar({ length: 100 }).default(''),
  street: varchar({ length: 100 }).default(''),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  addressLine1: varchar({ length: 250 }).default(''),
  addressLine2: varchar({ length: 250 }).default(''),
  number: integer(),
  zipCode: varchar({ length: 20 }).default(''),
  currentAmount: integer(),
  highestBid: integer(),
  userHighestBidId: integer().references(() => usersTable.id),
  slug: varchar({ length: 255 }).unique(),
});
