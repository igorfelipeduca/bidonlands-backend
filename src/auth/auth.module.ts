import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { drizzleProvider } from 'src/drizzle/drizzle.provider';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from 'src/email/email.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [AuthController],
  imports: [
    DrizzleModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '4h' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    forwardRef(() => UsersModule),
    forwardRef(() => EmailModule),
  ],
  providers: [AuthService, JwtStrategy, ...drizzleProvider],
  exports: [AuthService, JwtModule, DrizzleModule],
})
export class AuthModule {}
