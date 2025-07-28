import * as users from './users.schema';
import * as emailToken from './email-tokens.schema';
import * as documents from './documents.schema';
import * as bids from './bids.schema';
import * as adverts from './adverts.schema';
import * as payments from './payments.schema';
import * as wallets from './wallets.schema';
import * as withdrawalRequests from './withdrawal-requests.schema';

export const schema = {
  usersTable: users.usersTable,
  emailTokenTable: emailToken.emailTokenTable,
  documentsTable: documents.documentsTable,
  advertsTable: adverts.advertsTable,
  bidsTable: bids.bidsTable,
  paymentsTable: payments.paymentsTable,
  walletsTable: wallets.walletsTable,
  walletOperationsTable: wallets.walletOperationsTable,
  withdrawalRequestsTable: withdrawalRequests.withdrawalRequestsTable,
};
