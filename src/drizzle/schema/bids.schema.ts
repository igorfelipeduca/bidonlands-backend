import { boolean, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';
import { advertsTable } from './adverts.schema';

export const bidsTable = pgTable('bids', {
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
  amount: integer().notNull(),
  active: boolean().default(true),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type BidType = typeof bidsTable.$inferSelect;
