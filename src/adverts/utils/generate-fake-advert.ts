import { faker } from '@faker-js/faker';
import { US_STATES } from '../enums/us-states.enum';
import { randomEnumValue } from './random-enum-value';
import {
  SALES_TYPE_CHOICES,
  CATEGORY_CHOICES,
  ADS_TYPE_CHOICES,
  CONDITION_CHOICES,
  STATUS_CHOICES,
} from '../../drizzle/schema/enums/advert.enum';

export function generateFakeAdvert({
  userId,
  salesTypeChoices,
  categoryChoices,
  adsTypeChoices,
  conditionChoices,
  statusChoices,
}: {
  userId: number;
  salesTypeChoices: typeof SALES_TYPE_CHOICES;
  categoryChoices: typeof CATEGORY_CHOICES;
  adsTypeChoices: typeof ADS_TYPE_CHOICES;
  conditionChoices: typeof CONDITION_CHOICES;
  statusChoices: typeof STATUS_CHOICES;
}) {
  const stateValue = US_STATES[Math.floor(Math.random() * US_STATES.length)];
  const salesType = randomEnumValue(salesTypeChoices);
  const category = randomEnumValue(categoryChoices);
  const adsType = randomEnumValue(adsTypeChoices);
  const condition = randomEnumValue(conditionChoices);
  const status = randomEnumValue(statusChoices);

  // Ensure endsAt is never null and always a valid Date
  const endsAt = faker.date.soon({ days: 90 });
  if (!endsAt) {
    throw new Error('Failed to generate a valid endsAt date');
  }

  return {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    amount: faker.number.int({ min: 100, max: 1000000 }),
    salesType,
    category,
    adsType,
    condition,
    paymentInstructions: faker.lorem.sentence(),
    specialInstructions: faker.lorem.sentence(),
    additionalInformation: faker.lorem.sentence(),
    referenceId: faker.number.int({ min: 1, max: 999999 }),
    administratorFee: faker.number.int({ min: 100, max: 10000 }),
    endsAt,
    state: stateValue,
    city: faker.location.city(),
    status,
    userId: userId,
    country: faker.location.country(),
    street: faker.location.street(),
    addressLine1: faker.location.streetAddress(),
    addressLine2: faker.location.secondaryAddress(),
    number: faker.number.int({ min: 1, max: 9999 }),
    zipCode: faker.location.zipCode(),
    slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
    minBidAmount: faker.number.int({ min: 100, max: 100000 }),
  };
}
