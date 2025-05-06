import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { AdvertsController } from './webhook.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { EmailModule } from 'src/email/email.module';
import { GatewaysModule } from 'src/gateways/gateways.module';
import { BidsGateway } from 'src/gateways/bids.gateway';
import { BidsModule } from 'src/bids/bids.module';
import { BidsService } from 'src/bids/bids.service';
import { UsersService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [AdvertsController],
  providers: [WebhookService, BidsGateway, BidsService, UsersService],
  imports: [
    DrizzleModule,
    EmailModule,
    GatewaysModule,
    BidsModule,
    UsersModule,
  ],
})
export class WebhookModule {}
