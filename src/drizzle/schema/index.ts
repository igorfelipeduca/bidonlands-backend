import * as users from './users.schema';
import * as emailToken from './email-tokens.schema';
import * as attachment from './attachments.schema';
import * as bids from './bids.schema';
import * as adverts from './adverts.schema';
import * as bidIndents from './bid-intents.schema';

export const schema = {
  usersTable: users.usersTable,
  emailTokenTable: emailToken.emailTokenTable,
  attachmentsTable: attachment.attachmentsTable,
  advertsTable: adverts.advertsTable,
  bidsTable: bids.bidsTable,
  bidIntents: bidIndents.bidIntentsTable,
};
