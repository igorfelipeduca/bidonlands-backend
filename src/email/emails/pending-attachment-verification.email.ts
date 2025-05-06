export const PendingAttachmentVerificationEmail = ({
  userName,
  userEmail,
  documentName,
  approveUrl,
  denyUrl,
}: {
  userName?: string;
  userEmail: string;
  documentName: string;
  approveUrl: string;
  denyUrl: string;
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
              <p style="font-size:24px;line-height:1.25;margin-bottom:16px;margin-top:16px">
                <strong>Document Review Required</strong>
              </p>
              <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px;border:solid 1px #dedede;border-radius:5px;text-align:center">
                <tbody>
                  <tr>
                    <td>
                      <p style="font-size:14px;line-height:24px;margin:0 0 10px 0;text-align:left">
                        User <strong>${userName || userEmail}</strong> (<a href="mailto:${userEmail}">${userEmail}</a>) has uploaded a document for review.
                      </p>
                      <p style="font-size:14px;line-height:24px;margin:0 0 10px 0;text-align:left">
                        <strong>Document Name:</strong> ${documentName}
                      </p>
                      <p style="font-size:14px;line-height:24px;margin:0 0 20px 0;text-align:left">
                        Please review the attached document and take action below:
                      </p>
                      <a href="${approveUrl}" style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;font-size:14px;background-color:#28a745;color:#fff;border-radius:0.5em;padding:12px 24px;margin-right:8px" target="_blank">
                        Approve
                      </a>
                      <a href="${denyUrl}" style="line-height:1.5;text-decoration:none;display:inline-block;max-width:100%;font-size:14px;background-color:#d73a49;color:#fff;border-radius:0.5em;padding:12px 24px;margin-left:8px" target="_blank">
                        Deny
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p style="font-size:12px;line-height:24px;color:#6a737d;text-align:center;margin-top:60px;margin-bottom:16px">
                This is an internal notification for the operations team.
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
  `;
};
