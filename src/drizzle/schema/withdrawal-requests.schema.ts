import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';

export const withdrawalRequestsTable = pgTable('withdrawal_requests', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('userId')
    .notNull()
    .references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
  amount: integer('amount').notNull(),
  status: varchar({
    length: 10,
    enum: ['approved', 'finished', 'pending', 'denied'],
  })
    .notNull()
    .default('pending'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
