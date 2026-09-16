const { escapeHtml } = require('../utils/escapeHtml')

// sent to whichever side did NOT send the message sir (see controllers/Message.js's
// sendMessage) — one shared function for both directions, only the recipient name and
// a link back to the right dashboard differ.
exports.newMessageTemplate = (recipientName, jobTitle, companyName, messagePreview, dashboardLink) => {
  recipientName = escapeHtml(recipientName)
  jobTitle = escapeHtml(jobTitle)
  companyName = escapeHtml(companyName)
  messagePreview = escapeHtml(messagePreview)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Message – Resumify</title>
</head>
<body style="margin:0;padding:0;background-color:#0D1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background-color:#161D29;border-radius:20px;
                 overflow:hidden;border:1px solid #2C333F;">

          <tr>
            <td style="background:linear-gradient(90deg,#6366F1,#8B5CF6);height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:36px 48px 28px;text-align:center;background:#1C2130;">
              <div style="font-size:28px;font-weight:800;color:#FFD60A;letter-spacing:3px;
                          text-transform:uppercase;">Resumify</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px;">
              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;width:72px;height:72px;border-radius:50%;
                            background:#6366F11A;border:2px solid #6366F1;
                            line-height:72px;font-size:32px;text-align:center;">
                  💬
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                New message
              </h1>
              <p style="margin:0 0 24px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi <strong style="color:#F9FAFB;">${recipientName}</strong>,
                you have a new message about the
                <strong style="color:#F9FAFB;">${jobTitle}</strong> role at
                <strong style="color:#F9FAFB;">${companyName}</strong>.
              </p>

              <div style="background:#0D1117;border-radius:12px;padding:16px 20px;
                          border:1px solid #2C333F;">
                <p style="margin:0;font-size:14px;color:#D1D5DB;font-style:italic;">
                  "${messagePreview}"
                </p>
              </div>

              <div style="text-align:center;margin:28px 0 0;">
                <a href="${dashboardLink}" target="_blank"
                   style="display:inline-block;padding:15px 44px;border-radius:12px;
                          background:linear-gradient(90deg,#6366F1,#8B5CF6);
                          color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;
                          letter-spacing:0.5px;">
                  View and reply
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 48px 32px;text-align:center;background:#1C2130;
                       border-top:1px solid #2C333F;">
              <p style="margin:0;font-size:12px;color:#374151;">
                © ${new Date().getFullYear()} Resumify. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
