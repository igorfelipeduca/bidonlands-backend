import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { z } from 'zod';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../drizzle/schema';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { usersTable } from '../drizzle/schema/users.schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/email/email.service';
import Stripe from 'stripe';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(EmailService)
    private emailService: EmailService,
  ) {}

  async create(createUserDto: z.infer<typeof CreateUserDto>) {
    const { data, error, success } = CreateUserDto.safeParse(createUserDto);

    if (!success) {
      throw new BadRequestException(z.prettifyError(error));
    }

    const existingUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, data.email));

    if (existingUser.length > 0) {
      throw new BadRequestException('User already exists');
    }

    const insertData = {
      ...data,
      email: data.email,
      password: await bcrypt.hash(data.password, 16),
    };

    const result = await this.db
      .insert(usersTable)
      .values(insertData)
      .returning();

    await this.sendVerificationEmail(insertData.email, insertData.firstName);

    return result[0];
  }

  async sendVerificationEmail(userEmail: string, userName: string) {
    return await this.emailService.sendConfirmationEmail(userEmail, userName);
  }

  async sendAttachmentVerificationEmail(userEmail: string, userName: string) {
    return await this.emailService.sendAttachmentVerificationEmail(
      userEmail,
      userName,
    );
  }

  async findAll() {
    return await this.db.select().from(schema.usersTable);
  }

  async findOne(query: number | string) {
    let whereClause: ReturnType<typeof eq>;

    if (typeof query === 'number') {
      whereClause = eq(usersTable.id, query);
    } else {
      whereClause = eq(usersTable.email, query);
    }
    
    const result = await this.db.select().from(usersTable).where(whereClause);
    return result[0];
  }

  async update(
    id: number,
    data: z.infer<typeof UpdateUserDto>,
    userId: number,
  ) {
    const authUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!authUser.length) {
      throw new UnauthorizedException('User not found');
    }

    if (authUser[0].role !== 'admin' && authUser[0].id !== id) {
      throw new UnauthorizedException('You can only update your own account');
    }

    const user = await this.db
      .update(usersTable)
      .set(data)
      .where(eq(usersTable.id, id))
      .returning();

    return user[0];
  }

  async remove(id: number, authUserId: number) {
    const authUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, authUserId));

    if (!authUser.length) {
      throw new UnauthorizedException('User not found');
    }

    if (authUser[0].role !== 'admin' && authUser[0].id !== id) {
      throw new UnauthorizedException('You can only delete your own account');
    }

    const user = await this.db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning();

    if (!user.length) {
      throw new BadRequestException('User not found');
    }

    return user[0];
  }

  async registerStripeCustomer(userEmail: string) {
    const stripe = new Stripe(process.env.STRIPE_KEY ?? '');

    const customer = await stripe.customers.create({
      email: userEmail,
    });

    return customer;
  }
}
