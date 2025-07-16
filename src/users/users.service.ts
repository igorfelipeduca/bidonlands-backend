import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { z } from 'zod';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../drizzle/schema';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { usersTable, UserType } from '../drizzle/schema/users.schema';
import { eq, InferInsertModel } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/email/email.service';
import Stripe from 'stripe';
import { bidsTable } from 'src/drizzle/schema/bids.schema';
import {
  documentsTable,
  DocumentType,
} from 'src/drizzle/schema/documents.schema';
import { walletsTable, WalletType, walletOperationsTable, WalletOperationType } from 'src/drizzle/schema/wallets.schema';

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
    const res = await this.db.select().from(usersTable);

    return res;
  }

  async findOne(url: string, documents: string) {
    let user:
      | (UserType & { documents?: DocumentType[]; wallet?: WalletType & { operations?: WalletOperationType[] } })
      | null = null;

    let query = url.split('q=')[1] || '';
    query = query.split('&')[0].trim();

    if (query.includes('@')) {
      const users = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, query));
      user = users[0] || null;
    } else {
      const users = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, +query));
      user = users[0] || null;
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (documents === 'true') {
      const userDocuments = await this.db
        .select()
        .from(documentsTable)
        .where(eq(documentsTable.userId, user.id));
      user.documents = userDocuments;
    }

    const walletWithOperations = await this.db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, user.id))
      .leftJoin(
        walletOperationsTable,
        eq(walletsTable.id, walletOperationsTable.walletId),
      );

    if (walletWithOperations.length > 0) {
      const wallet = walletWithOperations[0].wallets;
      const operations = walletWithOperations
        .filter(row => row.wallet_operations !== null)
        .map(row => row.wallet_operations)
        .reverse();

      user.wallet = {
        ...wallet,
        operations: operations,
      };
    } else {
      user.wallet = null;
    }

    return user;
  }

  async findUserWithDocuments(userId: string) {
    const userAndDocuments = await this.db
      .select({
        user: usersTable,
        document: documentsTable,
      })
      .from(usersTable)
      .where(eq(usersTable.id, +userId))
      .leftJoin(documentsTable, eq(usersTable.id, documentsTable.userId));

    if (!userAndDocuments.length) {
      throw new NotFoundException('User not found');
    }

    const { user } = userAndDocuments[0];
    const documents = userAndDocuments
      .filter((row) => row.document)
      .map((row) => row.document);

    const walletWithOperations = await this.db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, user.id))
      .leftJoin(
        walletOperationsTable,
        eq(walletsTable.id, walletOperationsTable.walletId),
      );

    let wallet: (WalletType & { operations?: WalletOperationType[] }) | null = null;

    if (walletWithOperations.length > 0) {
      const walletData = walletWithOperations[0].wallets;
      const operations = walletWithOperations
        .filter(row => row.wallet_operations !== null)
        .map(row => row.wallet_operations)
        .reverse();

      wallet = {
        ...walletData,
        operations: operations,
      };
    }

    return {
      ...user,
      documents,
      wallet,
    };
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
