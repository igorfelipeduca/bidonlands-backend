import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Resend } from 'resend';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { schema } from '../drizzle/schema';
import { emailTokenTable } from 'src/drizzle/schema/email-tokens.schema';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { eq } from 'drizzle-orm';
import { AuthService } from 'src/auth/auth.service';
import { EmailConfirmationEmail } from './emails/email-confirmation.email';
import { AttachmentEmailVerificationEmail } from './emails/attachment-email-verification.email';
import { SendBidIntentEmail } from './emails/send-bid-intent.email';
import { ExistentBidEmail } from './emails/existent-bid.email';
import { BidDepositConfirmationEmail } from './emails/bid-deposit-confirmation.email';
import { PendingAttachmentVerificationEmail } from './emails/pending-attachment-verification.email';
import { OutbidEmail } from './emails/outbid.email';
import { Money } from '../lib/money-value-object';

@Injectable()
export class EmailService {
  private resend: Resend;
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    @Inject(AuthService)
    private authService: AuthService,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendConfirmationEmail(email: string, name: string) {
    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user.length) {
      throw new NotFoundException('User not found');
    }

    const token = await this.authService.generateValidateEmailToken(user[0]);

    const allTokens = await this.db
      .select()
      .from(emailTokenTable)
      .where(eq(emailTokenTable.userId, user[0].id));

    const allNotExpiredTokens = allTokens.filter(
      (t) => t.expiresAt > Date.now(),
    );

    for (const t of allNotExpiredTokens) {
      await this.db
        .update(emailTokenTable)
        .set({ expiresAt: Date.now() })
        .where(eq(emailTokenTable.token, t.token));
    }

    await this.db.insert(emailTokenTable).values({
      email: email,
      token,
      expiresAt: Date.now() + 15 * 60 * 1000, // 30 minutes in milliseconds
      userId: Number(user[0].id),
    });

    const verifyUrl = `http://localhost:9090/auth/verify?token=${token}`;

    const sentEmail = await this.resend.emails.send({
      from: 'BidOnLands <igor@duca.dev>',
      to: [email],
      subject: 'hello world',
      html: EmailConfirmationEmail({
        email,
        name: `${user[0].firstName} ${user[0].lastName}`,
        verifyUrl,
      }),
    });

    return sentEmail;
  }

  async sendAttachmentVerificationEmail(email: string, name: string) {
    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user.length) {
      throw new NotFoundException('User not found');
    }

    const token = await this.authService.generateValidateEmailToken(user[0]);

    await this.db.insert(emailTokenTable).values({
      email: email,
      token,
      expiresAt: Date.now() + 30 * 60 * 1000,
      userId: Number(user[0].id),
    });

    const verifyUrl = `http://localhost:9090/auth/verify?token=${token}`;

    const sentEmail = await this.resend.emails.send({
      from: 'BidOnLands <igor@duca.dev>',
      to: [email],
      subject: 'Verify your email to add attachments',
      html: AttachmentEmailVerificationEmail({
        email,
        name: `${user[0].firstName} ${user[0].lastName}`,
        verifyUrl,
      }),
    });

    return sentEmail;
  }

  async sendBidIntentEmail(
    userId: number,
    bid: {
      amount: number;
      paymentLink: string;
      depositValue: number;
      depositPercentage: number;
    },
  ) {
    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user || !user.length) {
      throw new NotFoundException('User not found');
    }

    const formattedAmount = new Money(bid.amount, 'USD', {
      isCents: true,
    }).format();
    const formattedDepositAmount = new Money(bid.depositValue, 'USD', {
      isCents: true,
    }).format();

    const sentEmail = await this.resend.emails.send({
      from: 'BidOnLands <igor@duca.dev>',
      to: [user[0].email],
      subject: `Complete Your ${formattedAmount} Bid Payment - ${bid.depositPercentage}% Deposit Required`,
      html: SendBidIntentEmail({
        user,
        bid,
        formattedAmount,
        formattedDepositAmount,
      }),
    });

    return sentEmail;
  }

  async sendExistingBidIntentEmail(
    userId: number,
    bid: {
      amount: number;
      paymentLink: string;
      depositValue: number;
      minutesLeft?: number;
      depositPercentage: number;
    },
  ) {
    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user || !user.length) {
      throw new NotFoundException('User not found');
    }

    const formattedAmount = new Money(bid.amount, 'USD', {
      isCents: true,
    }).format();
    const formattedDepositAmount = new Money(bid.depositValue, 'USD', {
      isCents: true,
    }).format();

    const sentEmail = await this.resend.emails.send({
      from: 'BidOnLands <igor@duca.dev>',
      to: [user[0].email],
      subject: `Complete Your ${formattedDepositAmount} Deposit for ${formattedAmount} Bid`,
      html: ExistentBidEmail({
        user,
        bid,
        formattedAmount,
        formattedDepositAmount,
      }),
    });

    return sentEmail;
  }

  async sendBidDepositConfirmationEmail(
    userId: number,
    bid: { amount: number; depositValue: number },
  ) {
    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user || !user.length) {
      throw new NotFoundException('User not found');
    }

    const formattedAmount = new Money(bid.amount, 'USD', {
      isCents: true,
    }).format();
    const formattedDepositAmount = new Money(bid.depositValue, 'USD', {
      isCents: true,
    }).format();

    const sentEmail = await this.resend.emails.send({
      from: 'BidOnLands <igor@duca.dev>',
      to: [user[0].email],
      subject: `Bid Confirmed - Your ${formattedAmount} Bid is Now Active`,
      html: BidDepositConfirmationEmail({
        user,
        bid,
        formattedAmount,
        formattedDepositAmount,
      }),
    });

    return sentEmail;
  }

  async sendPendingAttachmentVerificationEmail(
    userId: number,
    fileUrl: string,
    fileOriginalName: string,
    signedToken: string,
    attachmentId: number,
  ) {
    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user || !user.length) {
      throw new NotFoundException('User not found');
    }

    console.log({ user });

    const sentEmail = await this.resend.emails.send({
      from: 'BidOnLands <igor@duca.dev>',
      // TODO: add this email
      // to: "admin@thelanddepot.com",
      to: [user[0].email],
      subject: `[INTERNAL COMMUNICATION] A new document was submitted`,
      html: PendingAttachmentVerificationEmail({
        userName:
          `${user[0].firstName ?? ''} ${user[0].lastName ?? ''}`.trim() ||
          undefined,
        userEmail: user[0].email,
        documentName: 'Document',
        approveUrl: `http://localhost:9090/attachments/${attachmentId}/approve?token=${signedToken}`,
        denyUrl: `http://localhost:9090/attachments/${attachmentId}/deny?token=${signedToken}`,
      }),
      attachments: [
        {
          filename: fileOriginalName,
          content: fileUrl,
        },
      ],
    });

    console.log({ sentEmail });

    return sentEmail;
  }

  async sendOutbidEmail(
    userId: number,
    {
      amount,
      highestBid,
      formattedAmount,
      websiteUrl,
    }: {
      amount: number;
      highestBid: string;
      formattedAmount: string;
      websiteUrl: string;
    },
  ) {
    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user || !user.length) {
      throw new NotFoundException('User not found');
    }

    const sentEmail = await this.resend.emails.send({
      from: 'BidOnLands <igor@duca.dev>',
      to: [user[0].email],
      subject: `You've Been Outbid`,
      html: OutbidEmail({
        user,
        bid: {
          amount,
          highestBid,
        },
        formattedAmount,
        websiteUrl,
      }),
    });

    return sentEmail;
  }
}
