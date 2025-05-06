export const SendBidIntentEmail = ({
  user,
  bid,
  formattedAmount,
  formattedDepositAmount,
}: {
  user: { firstName?: string; email: string }[];
  bid: {
    amount: number;
    paymentLink: string;
    depositValue: number;
    depositPercentage: number;
  };
  formattedAmount: string;
  formattedDepositAmount: string;
}) => {
  return `
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
    `;
};
