import { Module } from '@nestjs/common';
import { DrizzleAsyncProvider, drizzleProvider } from './drizzle.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [...drizzleProvider],
  exports: [DrizzleAsyncProvider],
  imports: [ConfigModule],
})
export class DrizzleModule {}
