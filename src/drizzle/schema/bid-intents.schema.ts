import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';
import { advertsTable } from './adverts.schema';

export const bidIntentsTable = pgTable('bid-intents', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('userId')
    .notNull()
    .references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
  advertId: integer('advertId')
    .notNull()
    .references(() => advertsTable.id, {
      onDelete: 'cascade',
    }),
  bidAmount: integer().notNull(),
  stripeUniquePrice: varchar({ length: 255 }).notNull().default('').unique(),
  stripePaymentLink: varchar({ length: 255 }).notNull().default('').unique(),
  stripePaymentLinkId: varchar({ length: 255 }).notNull().default('').unique(),
  amount: integer().notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date' }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
