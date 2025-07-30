export const BidDepositConfirmationEmail = ({
  user,
  bid,
  formattedAmount,
  formattedDepositAmount,
}: {
  user: { firstName?: string; email: string }[];
  bid: { amount: number; depositValue: number };
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
                <img alt="BidOnLands" height="32" src="https://www.deedbid.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-dark.c5a29ad2.png&w=256&q=75" style="display:block;outline:none;border:none;text-decoration:none" width="auto" />
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
                          © ${new Date().getFullYear()} BidOnLands. All rights reserved.
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
