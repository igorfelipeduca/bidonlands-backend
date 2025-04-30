import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  controllers: [BidsController],
  providers: [BidsService],
  imports: [DrizzleModule, UsersModule, EmailModule],
})
export class BidsModule {}
