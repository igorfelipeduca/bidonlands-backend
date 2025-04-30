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
import { User, usersTable } from 'src/drizzle/schema/users.schema';
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
    const users = await this.usersService.findAll();
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

  async login(user: Partial<User>) {
    const payload = {
      email: user.email,
      sub: user.id,
      roles: [user.role],
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async generateValidateEmailToken(user: User) {
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

    return await this.db
      .update(usersTable)
      .set(updatePayload)
      .where(eq(usersTable.id, user[0].id))
      .returning();
  }
}
