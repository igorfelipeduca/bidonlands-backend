import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DrizzleModule } from './drizzle/drizzle.module';
import { DrizzlePostgresModule } from '@knaadh/nestjs-drizzle-postgres';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { AdvertsModule } from './adverts/adverts.module';
import { DocumentsModule } from './documents/documents.module';
import { BidsModule } from './bids/bids.module';
import { WebhookModule } from './webhook/webhook.module';
import { GatewaysModule } from './gateways/gateways.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdvertTasksModule } from './advert-tasks/advert-tasks.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    UsersModule,
    DrizzleModule,
    DrizzlePostgresModule.register({
      tag: 'postgres',
      postgres: {
        url: process.env.DATABASE_URL,
        config: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      },
      config: { schema: 'src/drizzle/schema/*.schema.ts' },
    }),
    ConfigModule.forRoot(),
    AuthModule,
    EmailModule,
    DocumentsModule,
    AdvertsModule,
    BidsModule,
    WebhookModule,
    GatewaysModule,
    ScheduleModule.forRoot(),
    AdvertTasksModule,
    PaymentsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
