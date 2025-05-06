import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Resend } from 'resend';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { schema } from '../drizzle/schema';
import { emailTokenTable } from 'src/drizzle/schema/email-tokens.schema';
import { usersTable } from 'src/drizzle/schema/users.schema';
import { eq } from 'drizzle-orm';
import { AuthService } from 'src/auth/auth.service';

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
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes in milliseconds
      userId: Number(user[0].id),
    });

    const verifyUrl = `http://localhost:9090/auth/verify?token=${token}`;

    const sentEmail = await this.resend.emails.send({
      from: 'Igor Duca <igor@duca.dev>',
      to: [email],
      subject: 'hello world',
      html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <link
      rel="preload"
      as="image"
      href="https://react-email-demo-b1j935u4o-resend.vercel.app/static/github.png" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <!--$-->
  </head>
  <body style='background-color:#ffffff;color:#24292e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"'>
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
      A fine-grained personal access token has been added to your account
      <a style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;font-size:14px;background-color:#28a745;color:#fff;border-radius:0.5em;padding:12px 24px 12px 24px" target="_blank">
        <span><!--[if mso]><i style="mso-font-width:400%;mso-text-raise:18" hidden>&#8202;&#8202;&#8202;</i><![endif]--></span>
        <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">View your token</span>
        <span><!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8202;&#8203;</i><![endif]--></span>
      </a>
    </div>
    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;margin:0 auto;padding:20px 0 48px">
      <tbody>
        <tr style="width:100%">
          <td>
            <img alt="BidOnLands" height="32" src="https://www.deedbid.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-dark.c5a29ad2.png&w=256&q=75" style="display:block;outline:none;border:none;text-decoration:none" width="auto" />
            <p style="font-size:24px;line-height:1.25;margin-bottom:16px;margin-top:16px">
              <strong>${name ?? email}</strong>, please confirm your email.
            </p>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px;border:solid 1px #dedede;border-radius:5px;text-align:center">
              <tbody>
                <tr>
                  <td>
                    <p style="font-size:14px;line-height:24px;margin:0 0 10px 0;text-align:left;margin-bottom:10px;margin-top:0;margin-left:0;margin-right:0">
                      Hey <strong>${name ?? email}</strong>!
                    </p>
                    <p style="font-size:14px;line-height:24px;margin:0 0 10px 0;text-align:left;margin-bottom:10px;margin-top:0;margin-left:0;margin-right:0">
                      Welcome aboard! Thank you for joining us. To get started, please take a moment to confirm your email address by clicking the button below.
                    </p>
                    <a href="${verifyUrl}" style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;font-size:14px;background-color:#AB8551;color:#fff;border-radius:0.5em;padding:12px 24px 12px 24px" target="_blank">
                      <span><!--[if mso]><i style="mso-font-width:400%;mso-text-raise:18" hidden>&#8202;&#8202;&#8202;</i><![endif]--></span>
                      <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">Confirm your account</span>
                      <span><!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8202;&#8203;</i><![endif]--></span>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
            <p style="font-size:14px;line-height:24px;text-align:center;margin-bottom:16px;margin-top:16px">
              <a style="color:#0366d6;text-decoration-line:none;font-size:12px" target="_blank">Your security audit log</a>
              ・<!-- -->
              <a style="color:#0366d6;text-decoration-line:none;font-size:12px" target="_blank">Contact support</a>
            </p>
            <p style="font-size:12px;line-height:24px;color:#6a737d;text-align:center;margin-top:60px;margin-bottom:16px">
              GitHub, Inc. ・88 Colin P Kelly Jr Street ・San Francisco, CA 94107
            </p>
          </td>
        </tr>
      </tbody>
    </table>
    <!--/$-->
  </body>
</html>
`,
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
      from: 'Igor Duca <igor@duca.dev>',
      to: [email],
      subject: 'Verify your email to add attachments',
      html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <link
      rel="preload"
      as="image"
      href="https://react-email-demo-b1j935u4o-resend.vercel.app/static/github.png" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body style='background-color:#ffffff;color:#24292e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"'>
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
      You tried to add a new attachment, but your email is not verified.
      <a style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;font-size:14px;background-color:#28a745;color:#fff;border-radius:0.5em;padding:12px 24px 12px 24px" target="_blank">
        <span></span>
        <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">Verify your email</span>
        <span></span>
      </a>
    </div>
    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;margin:0 auto;padding:20px 0 48px">
      <tbody>
        <tr style="width:100%">
          <td>
            <img alt="BidOnLands" height="32" src="https://www.deedbid.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-dark.c5a29ad2.png&w=256&q=75" style="display:block;outline:none;border:none;text-decoration:none" width="auto" />
            <p style="font-size:24px;line-height:1.25;margin-bottom:16px;margin-top:16px">
              <strong>${name ?? email}</strong>, verify your email to add attachments.
            </p>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px;border:solid 1px #dedede;border-radius:5px;text-align:center">
              <tbody>
                <tr>
                  <td>
                    <p style="font-size:14px;line-height:24px;margin:0 0 10px 0;text-align:left;margin-bottom:10px;margin-top:0;margin-left:0;margin-right:0">
                      Hey <strong>${name ?? email}</strong>!
                    </p>
                    <p style="font-size:14px;line-height:24px;margin:0 0 10px 0;text-align:left;margin-bottom:10px;margin-top:0;margin-left:0;margin-right:0">
                      You attempted to add a new attachment, but your email address is not verified. Please confirm your email address by clicking the button below to continue adding attachments.
                    </p>
                    <a href="${verifyUrl}" style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;font-size:14px;background-color:#AB8551;color:#fff;border-radius:0.5em;padding:12px 24px 12px 24px" target="_blank">
                      <span></span>
                      <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">Verify your email</span>
                      <span></span>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
            <p style="font-size:14px;line-height:24px;text-align:center;margin-bottom:16px;margin-top:16px">
              <a style="color:#0366d6;text-decoration-line:none;font-size:12px" target="_blank">Your security audit log</a>
              ・<!-- -->
              <a style="color:#0366d6;text-decoration-line:none;font-size:12px" target="_blank">Contact support</a>
            </p>
            <p style="font-size:12px;line-height:24px;color:#6a737d;text-align:center;margin-top:60px;margin-bottom:16px">
              GitHub, Inc. ・88 Colin P Kelly Jr Street ・San Francisco, CA 94107
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`,
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

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(bid.amount / 100);

    const formattedDepositAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(bid.depositValue / 100);

    const sentEmail = await this.resend.emails.send({
      from: 'Igor Duca <igor@duca.dev>',
      to: [user[0].email],
      subject: `Complete Your ${formattedAmount} Bid Payment - ${bid.depositPercentage}% Deposit Required`,
      html: `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html dir="ltr" lang="en">
      <head>
        <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
        <meta name="x-apple-disable-message-reformatting" />
      </head>
      <body style='background-color:#ffffff;color:#24292e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"'>
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;margin:0 auto;padding:20px 0 48px">
          <tbody>
            <tr style="width:100%">
              <td>
                <img alt="DeedBid" height="32" src="https://www.deedbid.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-dark.c5a29ad2.png&w=256&q=75" style="display:block;outline:none;border:none;text-decoration:none" width="auto" />
                <p style="font-size:24px;line-height:1.25;margin:24px 0;color:#AB8551">
                  <strong>Your Bid is Reserved - ${bid.depositPercentage}% Deposit Required</strong>
                </p>
                <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px;border:solid 1px #dedede;border-radius:5px;text-align:center;background-color:#f8f9fa">
                  <tbody>
                    <tr>
                      <td>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          Hello <strong>${user[0].firstName || user[0].email}</strong>,
                        </p>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          Great news! Your bid of <strong>${formattedAmount}</strong> has been temporarily reserved. To secure your position and finalize your bid, you are required to pay a <strong>${bid.depositPercentage}% deposit</strong> of your bid amount, which is <strong>${formattedDepositAmount}</strong>.
                        </p>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          <strong>Why is this required?</strong> The ${bid.depositPercentage}% deposit (<strong>${formattedDepositAmount}</strong>) is necessary to officially apply your bid and demonstrate your commitment. This amount will be deducted from your total bid if you win.
                        </p>
                        <p style="font-size:16px;line-height:24px;margin:0 0 24px 0;text-align:left;color:#664B2F">
                          <strong>⚠️ Important:</strong> This reservation is time-sensitive. Complete your payment within the next 15 minutes to avoid losing your bid position.
                        </p>
                        <a href="${bid.paymentLink}" style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;font-size:16px;background-color:#AB8551;color:#fff;border-radius:0.5em;padding:16px 32px;font-weight:600" target="_blank">
                          <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px">Pay ${bid.depositPercentage}% Deposit Now</span>
                        </a>
                        <p style="font-size:14px;line-height:20px;margin:24px 0 0 0;text-align:left;color:#664B2F">
                          By completing this payment, you confirm your bid and agree to our terms of service. The payment is processed securely through Stripe.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px">
                  <tbody>
                    <tr>
                      <td>
                        <p style="font-size:14px;line-height:20px;margin:0 0 8px 0;color:#664B2F;text-align:center">
                          Need help? Contact our support team
                        </p>
                        <p style="font-size:12px;line-height:16px;margin:0;color:#6a737d;text-align:center">
                          © ${new Date().getFullYear()} DeedBid. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
    `,
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

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(bid.amount / 100);

    const formattedDepositAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(bid.depositValue / 100);

    const sentEmail = await this.resend.emails.send({
      from: 'Igor Duca <igor@duca.dev>',
      to: [user[0].email],
      subject: `Complete Your ${formattedDepositAmount} Deposit for ${formattedAmount} Bid`,
      html: `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html dir="ltr" lang="en">
      <head>
        <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
        <meta name="x-apple-disable-message-reformatting" />
      </head>
      <body style='background-color:#ffffff;color:#24292e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"'>
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;margin:0 auto;padding:20px 0 48px">
          <tbody>
            <tr style="width:100%">
              <td>
                <img alt="DeedBid" height="32" src="https://www.deedbid.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-dark.c5a29ad2.png&w=256&q=75" style="display:block;outline:none;border:none;text-decoration:none" width="auto" />
                <p style="font-size:24px;line-height:1.25;margin:24px 0;color:#AB8551">
                  <strong>Complete Your Deposit Payment</strong>
                </p>
                <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px;border:solid 1px #dedede;border-radius:5px;text-align:center;background-color:#f8f9fa">
                  <tbody>
                    <tr>
                      <td>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          Hello <strong>${user[0].firstName || user[0].email}</strong>,
                        </p>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          You recently started placing a bid of <strong>${formattedAmount}</strong>. To confirm your bid, a deposit payment of <strong>${formattedDepositAmount}</strong> (${bid.depositPercentage}% of your bid) is required.
                        </p>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          <strong>What happens next:</strong>
                          <ul style="margin:8px 0;padding-left:20px">
                            <li style="margin-bottom:8px">Complete the ${formattedDepositAmount} deposit payment using the button below</li>
                            <li style="margin-bottom:8px">Your bid of ${formattedAmount} will be officially placed</li>
                            <li>If you win, this deposit will be deducted from your total payment</li>
                          </ul>
                        </p>
                        <p style="font-size:16px;line-height:24px;margin:0 0 24px 0;text-align:left;color:#664B2F">
                          <strong>⚠️ Time Sensitive:</strong> This deposit payment link will expire in ${bid.minutesLeft ? `${bid.minutesLeft} minute${bid.minutesLeft === 1 ? '' : 's'}` : '15 minutes'}. After expiration, you'll need to start the bidding process again.
                        </p>
                        <a href="${bid.paymentLink}" style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;font-size:16px;background-color:#AB8551;color:#fff;border-radius:0.5em;padding:16px 32px;font-weight:600" target="_blank">
                          <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px">Complete Payment Now</span>
                        </a>
                        <p style="font-size:14px;line-height:20px;margin:24px 0 0 0;text-align:left;color:#664B2F">
                          By completing this payment, you confirm your bid and agree to our terms of service. The payment is processed securely through Stripe.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px">
                  <tbody>
                    <tr>
                      <td>
                        <p style="font-size:14px;line-height:20px;margin:0 0 8px 0;color:#664B2F;text-align:center">
                          Need help? Contact our support team
                        </p>
                        <p style="font-size:12px;line-height:16px;margin:0;color:#6a737d;text-align:center">
                          © ${new Date().getFullYear()} DeedBid. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
    `,
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

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(bid.amount / 100);

    const formattedDepositAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(bid.depositValue / 100);

    const sentEmail = await this.resend.emails.send({
      from: 'Igor Duca <igor@duca.dev>',
      to: [user[0].email],
      subject: `Bid Confirmed - Your ${formattedAmount} Bid is Now Active`,
      html: `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html dir="ltr" lang="en">
      <head>
        <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
        <meta name="x-apple-disable-message-reformatting" />
      </head>
      <body style='background-color:#ffffff;color:#24292e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"'>
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;margin:0 auto;padding:20px 0 48px">
          <tbody>
            <tr style="width:100%">
              <td>
                <img alt="DeedBid" height="32" src="https://www.deedbid.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-dark.c5a29ad2.png&w=256&q=75" style="display:block;outline:none;border:none;text-decoration:none" width="auto" />
                <p style="font-size:24px;line-height:1.25;margin:24px 0;color:#AB8551">
                  <strong>Your Bid is Now Active</strong>
                </p>
                <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px;border:solid 1px #dedede;border-radius:5px;text-align:center;background-color:#f8f9fa">
                  <tbody>
                    <tr>
                      <td>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          Hello <strong>${user[0].firstName || user[0].email}</strong>,
                        </p>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          Thank you for completing your deposit payment of <strong>${formattedDepositAmount}</strong>. Your bid of <strong>${formattedAmount}</strong> is now officially active and binding.
                        </p>
                        <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                          <strong>What this means:</strong>
                          <ul style="margin:8px 0;padding-left:20px">
                            <li style="margin-bottom:8px">Your bid is now legally binding</li>
                            <li style="margin-bottom:8px">The ${formattedDepositAmount} deposit will be applied to your total payment if you win</li>
                            <li>You will be notified immediately if you become the winning bidder</li>
                          </ul>
                        </p>
                        <p style="font-size:14px;line-height:20px;margin:24px 0 0 0;text-align:left;color:#664B2F">
                          Please note: This bid represents a legally binding commitment. If you become the winning bidder, you will be required to complete the purchase at the full bid amount of ${formattedAmount}.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px">
                  <tbody>
                    <tr>
                      <td>
                        <p style="font-size:14px;line-height:20px;margin:0 0 8px 0;color:#664B2F;text-align:center">
                          Need help? Contact our support team
                        </p>
                        <p style="font-size:12px;line-height:16px;margin:0;color:#6a737d;text-align:center">
                          © ${new Date().getFullYear()} DeedBid. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
    `,
    });

    return sentEmail;
  }
}
