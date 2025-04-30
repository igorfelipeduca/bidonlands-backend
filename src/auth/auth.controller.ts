import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
const LoginDto = z.object({
  email: z.email({ error: 'Invalid email' }),
  password: z
    .string({ error: 'Password must be a string' })
    .nonempty({ error: 'Password must not be empty' }),
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
}
