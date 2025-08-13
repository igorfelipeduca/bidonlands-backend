import {
  integer,
  pgTable,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import {
  GENDER_CHOICES,
  TYPE_CHOICES,
  ACCOUNT_CHOICES,
  ROLE_CHOICES,
  CONTACT_TITLE_CHOICES,
} from './enums/user.enum';
import { DocumentType } from './documents.schema';

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firstName: varchar({ length: 150 }).notNull().default(''),
  lastName: varchar({ length: 150 }).notNull().default(''),
  contactTitle: varchar({
    length: 10,
    enum: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Mx.'],
  })
    .notNull()
    .default(CONTACT_TITLE_CHOICES.MR),
  addressLine: varchar({ length: 255 }).notNull().default(''),
  addressLine2: varchar({ length: 255 }).notNull().default(''),
  city: varchar({ length: 100 }).notNull().default(''),
  state: varchar({ length: 100 }).notNull().default(''),
  zipCode: varchar({ length: 20 }).notNull().default(''),
  country: varchar({ length: 100 }).notNull().default(''),
  phoneNumber: varchar({ length: 15 }).notNull().default(''),
  birthDate: varchar({ length: 255 }).notNull().default(''),
  gender: varchar({ length: 1, enum: ['M', 'F', 'O'] })
    .notNull()
    .default(GENDER_CHOICES.MALE),
  userType: varchar({ length: 1, enum: ['B', 'S'] })
    .notNull()
    .default(TYPE_CHOICES.BUYER),
  accountType: varchar({ length: 1, enum: ['B', 'P'] })
    .notNull()
    .default(ACCOUNT_CHOICES.PERSONAL),
  role: varchar({ length: 20, enum: ['user', 'admin'] })
    .notNull()
    .default(ROLE_CHOICES.USER),
  company: varchar({ length: 100 }).notNull().default(''),
  accountingEmail: varchar({ length: 100 }).notNull().default(''),
  accountingPhone: varchar({ length: 100 }).notNull().default(''),
  account: varchar({ length: 20 }).notNull().default(''),
  email: varchar({ length: 255 }).notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  password: varchar({ length: 255 }).notNull().default(''),
  stripeCustomerId: varchar({ length: 255 }).notNull().default('').unique(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserType = typeof usersTable.$inferSelect & {
  documents?: DocumentType[];
};
