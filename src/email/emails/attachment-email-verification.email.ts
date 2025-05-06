export const AttachmentEmailVerificationEmail = ({
  name,
  email,
  verifyUrl,
}: {
  name?: string;
  email: string;
  verifyUrl: string;
}) => {
  return `
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
`;
};
