import {
  integer,
  pgTable,
  varchar,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { ATTACHMENT_TYPE_CHOICES } from './enums/attachment.enum';
import { advertsTable } from './adverts.schema';
import { usersTable } from './users.schema';

export const attachmentsTable = pgTable('attachments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 150 }).notNull().default(''),
  extension: varchar({ length: 50 }).notNull().default(''),
  size: integer().notNull().default(0),
  url: varchar({ length: 250 }).notNull().default(''),
  key: varchar({ length: 150 }).notNull().default(''),
  type: varchar({ length: 1, enum: ['1', '2'] })
    .notNull()
    .default(ATTACHMENT_TYPE_CHOICES.USER_PERSONAL_INFO_DOCUMENT),
  tags: varchar().notNull().default(''),
  userId: integer('userId')
    .notNull()
    .references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  advertId: integer().references(() => advertsTable.id, {
    onDelete: 'cascade',
  }),
  isApproved: boolean().default(false),
});
