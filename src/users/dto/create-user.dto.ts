import { z } from 'zod';

export const CreateUserDto = z.object({
  firstName: z
    .string()
    .max(150, { error: 'First name must be 150 characters or less' })
    .optional(),
  lastName: z
    .string()
    .max(150, { error: 'Last name must be 150 characters or less' })
    .optional(),
  contactTitle: z
    .string()
    .max(10, { error: 'Contact title must be 10 characters or less' })
    .optional(),
  addressLine: z
    .string()
    .max(255, { error: 'Address line must be 255 characters or less' })
    .optional(),
  addressLine2: z
    .string()
    .max(255, { error: 'Address line 2 must be 255 characters or less' })
    .optional(),
  city: z
    .string()
    .max(100, { error: 'City must be 100 characters or less' })
    .optional(),
  state: z
    .string()
    .max(100, { error: 'State must be 100 characters or less' })
    .optional(),
  zipCode: z
    .string()
    .max(20, { error: 'Zip code must be 20 characters or less' })
    .optional(),
  country: z
    .string()
    .max(100, { error: 'Country must be 100 characters or less' })
    .optional(),
  phoneNumber: z
    .string()
    .max(15, { error: 'Phone number must be 15 characters or less' })
    .optional(),
  birthDate: z
    .string()
    .max(255, { error: 'Birth date must be 255 characters or less' })
    .optional(),
  gender: z.string().max(1, { error: 'Gender must be 1 character' }).optional(),
  type: z.enum(['user', 'admin']).optional().default('user'),
  company: z
    .string()
    .max(100, { error: 'Company name must be 100 characters or less' })
    .optional(),
  accountingEmail: z
    .email()
    .max(100, { error: 'Accounting email must be 100 characters or less' })
    .optional(),
  accountingPhone: z
    .string()
    .max(100, { error: 'Accounting phone must be 100 characters or less' })
    .optional(),
  account: z
    .string()
    .max(20, { error: 'Account must be 20 characters or less' }),
  email: z
    .email({ error: 'Email is invalid' })
    .max(255, { error: 'Email must be 255 characters or less' })
    .optional(),
  password: z
    .string()
    .max(255, { error: 'Password must be 255 characters or less' }),
  role: z.enum(['user', 'admin']).default('user'),
  emailVerified: z.boolean().optional().default(false),
});
