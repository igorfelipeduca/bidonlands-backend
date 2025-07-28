import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';
import { relations } from 'drizzle-orm';

export const walletsTable = pgTable('wallets', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('userId')
    .notNull()
    .references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
  balance: integer().notNull().default(0),
  billingAddress: text('billingAddress'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const walletOperationsTable = pgTable('wallet_operations', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  walletId: integer('walletId')
    .notNull()
    .references(() => walletsTable.id, {
      onDelete: 'cascade',
    }),
  balanceChange: integer().notNull(),
  balanceBefore: integer().notNull(),
  balanceAfter: integer().notNull(),
  operationType: text('operationType', {
    enum: ['withdrawal', 'deposit', 'auction payment'],
  }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  status: text('status', {
    enum: ['processed', 'denied', 'pending'],
  })
    .notNull()
    .default('pending'),
});

export const walletsRelations = relations(walletsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [walletsTable.userId],
    references: [usersTable.id],
  }),
  operations: many(walletOperationsTable),
}));

export const walletOperationsRelations = relations(
  walletOperationsTable,
  ({ one }) => ({
    wallet: one(walletsTable, {
      fields: [walletOperationsTable.walletId],
      references: [walletsTable.id],
    }),
  }),
);

export type WalletType = typeof walletsTable.$inferSelect;
export type WalletOperationType = typeof walletOperationsTable.$inferSelect;
