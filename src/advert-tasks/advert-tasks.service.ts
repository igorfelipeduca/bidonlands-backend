import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AdvertsService } from 'src/adverts/adverts.service';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { schema } from 'src/drizzle/schema';
import { advertsTable } from 'src/drizzle/schema/adverts.schema';
import { bidsTable, BidType } from 'src/drizzle/schema/bids.schema';
import { STATUS_CHOICES } from 'src/drizzle/schema/enums/advert.enum';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { getHighestBid } from 'src/lib/get-highest-bid';

@Injectable()
export class AdvertTasksService {
  private readonly logger: Logger;

  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(AdvertsService)
    private advertsService: AdvertsService,
  ) {
    this.logger = new Logger(AdvertTasksService.name);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const advertsAndBids = await this.db
      .select()
      .from(advertsTable)
      .orderBy(advertsTable.id)
      .leftJoin(bidsTable, eq(bidsTable.advertId, advertsTable.id));

    for (const advertAndBid of advertsAndBids) {
      const { adverts, bids: rawBids } = advertAndBid;

      const bids: BidType[] = rawBids
        ? Array.isArray(rawBids)
          ? rawBids
          : [rawBids]
        : [];

      if (bids.length === 0) {
        continue;
      }

      const highestBid = getHighestBid(bids);

      if (!highestBid || adverts.status !== STATUS_CHOICES.ACTIVE) {
        this.logger.debug('No valid highest bid found. Ignoring');
        continue;
      }

      const userResult = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, highestBid.userId));

      if (!userResult || userResult.length === 0) {
        this.logger.debug('No user found for highest bid. Ignoring');
        continue;
      }

      await this.advertsService.announceWinner(
        adverts.id,
        highestBid.userId,
        highestBid.amount,
      );
    }

    const ignoredCount = advertsAndBids.filter((ab: any) => {
      const bids = ab.bids
        ? Array.isArray(ab.bids)
          ? ab.bids
          : [ab.bids]
        : [];
      return bids.length === 0;
    }).length;

    this.logger.debug(`Ignored ${ignoredCount} adverts`);
  }
}
