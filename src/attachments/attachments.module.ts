import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  imports: [
    DrizzleModule,
    UsersModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: "90 days" },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AttachmentsModule {}
