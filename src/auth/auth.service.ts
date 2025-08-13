import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { UserType, usersTable } from 'src/drizzle/schema/users.schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../drizzle/schema/index';
import { eq, InferInsertModel } from 'drizzle-orm';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { emailTokenTable } from 'src/drizzle/schema/email-tokens.schema';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(JwtService)
    private jwtService: JwtService,
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async validateUser(email: string, password: string) {
    const users = (await this.usersService.findAll()) as UserType[];
    const user = users.find((u) => u.email === email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: Partial<UserType>) {
    const payload = {
      email: user.email,
      sub: user.id,
      roles: [user.role],
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async generateValidateEmailToken(user: UserType) {
    const tokenPayload = {
      email: user.email,
    };

    const token = await this.jwtService.signAsync(tokenPayload);

    return token;
  }

  async verifyAccount(token: string) {
    const dbToken = await this.db
      .select()
      .from(emailTokenTable)
      .where(eq(emailTokenTable.token, token));

    if (!dbToken || !dbToken.length) {
      throw new InternalServerErrorException(
        'Invalid email verification token',
      );
    }

    if (dbToken[0].expiresAt < Date.now()) {
      throw new UnauthorizedException('Email verification token has expired');
    }

    const decodedJWT = (await this.jwtService.verifyAsync(token)) as {
      email: string;
    };

    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, decodedJWT.email));

    if (!user || !user.length) {
      throw new InternalServerErrorException(
        'Authentication token does not have a valid user',
      );
    }

    const customer = await this.usersService.registerStripeCustomer(
      user[0].email,
    );

    const updatePayload = {
      emailVerified: true,
      stripeCustomerId: customer.id,
    } as Partial<InferInsertModel<typeof usersTable>>;

    const emailTokenPayload = {
      used: true,
    } as Partial<InferInsertModel<typeof emailTokenTable>>;

    await this.db
      .update(emailTokenTable)
      .set(emailTokenPayload)
      .where(eq(emailTokenTable.token, token));

    return await this.db
      .update(usersTable)
      .set(updatePayload)
      .where(eq(usersTable.id, user[0].id))
      .returning();
  }

  async resendVerificationEmail(email: string) {
    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user || !user.length) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user[0].emailVerified) {
      throw new Error('ALREADY_VERIFIED');
    }

    const existingToken = await this.db
      .select()
      .from(emailTokenTable)
      .where(eq(emailTokenTable.userId, user[0].id));

    if (existingToken.length > 0) {
      const lastSent = existingToken[0].createdAt;
      const now = new Date();
      const timeDiffMinutes = Math.floor(
        (now.getTime() - lastSent.getTime()) / (1000 * 60),
      );

      if (timeDiffMinutes < 5) {
        const remainingTime = 5 - timeDiffMinutes;
        throw new Error(
          `RATE_LIMITED: Please wait ${remainingTime} minute${remainingTime === 1 ? '' : 's'} before requesting another verification email.`,
        );
      }

      await this.db
        .delete(emailTokenTable)
        .where(eq(emailTokenTable.userId, user[0].id));
    }

    await this.usersService.sendVerificationEmail(
      user[0].email,
      user[0].firstName,
    );

    return {
      message: 'Verification email sent successfully',
      email: user[0].email,
    };
  }
}
