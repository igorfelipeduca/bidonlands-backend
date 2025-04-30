import { Module } from '@nestjs/common';
import { AdvertsService } from './adverts.service';
import { AdvertsController } from './adverts.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [AdvertsController],
  providers: [AdvertsService],
  imports: [DrizzleModule, AuthModule],
})
export class AdvertsModule {}
