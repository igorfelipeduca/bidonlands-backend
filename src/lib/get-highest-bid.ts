import { BidType } from 'src/drizzle/schema/bids.schema';
import { Money } from './money-value-object';

export const getHighestBid = (bids: BidType[]) => {
  const highestBid = bids.length
    ? bids.reduce((maxBid, bid) => {
        const bidAmount = new Money(bid.amount, 'USD', { isCents: true });
        return !maxBid ||
          bidAmount.getInCents() >
            new Money(maxBid.amount, 'USD', { isCents: true }).getInCents()
          ? bid
          : maxBid;
      }, null)
    : null;

  return highestBid;
};
