import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';

const LoginDto = z.object({
  email: z.email({ error: 'Invalid email' }),
  password: z
    .string({ error: 'Password must be a string' })
    .nonempty({ error: 'Password must not be empty' }),
});

const ResendVerificationDto = z.object({
  email: z.string().email('Invalid email format'),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: z.infer<typeof LoginDto>) {
    const { data, success } = LoginDto.safeParse(loginDto);

    if (!success) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const result = await this.authService.validateUser(
      data.email,
      data.password,
    );

    if (!result) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(result);
  }

  @Get('verify')
  async confirmEmail(@Query('token') token: string) {
    return await this.authService.verifyAccount(token);
  }

  @Post('resend-verification')
  async resendVerification(
    @Body() body: z.infer<typeof ResendVerificationDto>,
  ) {
    const { data, success, error } = ResendVerificationDto.safeParse(body);

    if (!success) {
      throw new BadRequestException('Invalid email format');
    }

    try {
      return await this.authService.resendVerificationEmail(data.email);
    } catch (error) {
      if (error.message.includes('RATE_LIMITED')) {
        throw new BadRequestException(error.message);
      }
      if (error.message.includes('ALREADY_VERIFIED')) {
        throw new BadRequestException('Email is already verified');
      }
      if (error.message.includes('USER_NOT_FOUND')) {
        throw new BadRequestException('User not found');
      }
      throw new BadRequestException('Failed to resend verification email');
    }
  }
}
