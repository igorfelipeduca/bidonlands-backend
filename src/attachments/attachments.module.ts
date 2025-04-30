import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  imports: [DrizzleModule, UsersModule, EmailModule],
})
export class AttachmentsModule {}
