import { integer, pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { PAYMENT_STATUS } from './enums/payment-status.enum';
import { advertsTable } from './adverts.schema';
import { usersTable } from './users.schema';

export const paymentsTable = pgTable('payments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  description: varchar({ length: 150 }).notNull().default(''),
  amount: integer(),
  url: varchar({ length: 250 }).notNull().default(''),
  userId: integer('userId')
    .notNull()
    .references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
  advertId: integer().references(() => advertsTable.id, {
    onDelete: 'cascade',
  }),
  status: integer().default(PAYMENT_STATUS.PENDING),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PaymentType = typeof paymentsTable.$inferSelect;
