import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { AdvertsController } from './webhook.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  controllers: [AdvertsController],
  providers: [WebhookService],
  imports: [DrizzleModule, EmailModule],
})
export class WebhookModule {}
