import { UserType } from 'src/drizzle/schema/users.schema';

interface PaymentLinkCreationEmailProps {
  user: UserType;
  amount: string;
  url: string;
}

export const PaymentLinkCreationEmail = ({
  user,
  amount,
  url,
}: PaymentLinkCreationEmailProps) => `
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
              <strong>Complete Your Bid Deposit</strong>
            </p>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px;border:solid 1px #dedede;border-radius:5px;text-align:center;background-color:#f8f9fa">
              <tbody>
                <tr>
                  <td>
                    <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                      Hello <strong>${user.firstName || user.email}</strong>,
                    </p>
                    <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                      Please pay the initial deposit to bind your bid of <strong>${amount}</strong>!
                    </p>
                    <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                      To ensure the integrity of our auction process and protect all participants, we require an initial deposit for certain bids. This deposit serves several important purposes:
                    </p>
                    <ul style="margin:8px 0;padding-left:20px">
                      <li style="margin-bottom:8px">Demonstrates your serious intent to participate in the auction</li>
                      <li style="margin-bottom:8px">Helps prevent non-serious bids that could disrupt the auction process</li>
                      <li style="margin-bottom:8px">Protects the seller and other bidders from potential bid abandonment</li>
                    </ul>
                    <p style="font-size:16px;line-height:24px;margin:0 0 16px 0;text-align:left">
                      Your deposit will be held securely and will be:
                    </p>
                    <ul style="margin:8px 0;padding-left:20px">
                      <li style="margin-bottom:8px">Applied towards your final payment if you win the auction</li>
                      <li style="margin-bottom:8px">Refunded in full if you are outbid</li>
                      <li style="margin-bottom:8px">Returned if the auction is cancelled</li>
                    </ul>
                    <a href="${url}" style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;font-size:16px;background-color:#AB8551;color:#fff;border-radius:0.5em;padding:16px 32px;font-weight:600" target="_blank">
                      <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px">Pay Deposit Now</span>
                    </a>
                    <p style="font-size:14px;line-height:20px;margin:24px 0 0 0;text-align:left;color:#664B2F">
                      If you have any questions about the deposit process, please don't hesitate to contact our support team.
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
`;
