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
import { AttachmentsModule } from './attachments/attachments.module';
import { BidsModule } from './bids/bids.module';
import { WebhookModule } from './webhook/webhook.module';

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
    AttachmentsModule,
    AdvertsModule,
    BidsModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
