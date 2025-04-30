import {
  integer,
  pgTable,
  varchar,
  boolean,
  bigint,
  timestamp,
} from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';

export const emailTokenTable = pgTable('email-token', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  email: varchar({ length: 255 }).notNull(),
  token: varchar({ length: 255 }).notNull().unique(),
  expiresAt: bigint('expiresAt', { mode: 'number' }).notNull(),
  used: boolean().default(false),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
});
