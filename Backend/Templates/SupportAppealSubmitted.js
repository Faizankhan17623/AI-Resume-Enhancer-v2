const { escapeHtml } = require('../utils/escapeHtml')

// sent to ADMIN_ALERT_EMAIL sir — controllers/user.js's submitSuspensionAppeal, only for
// role: 'Support' (the one-shot appeal is Support-specific, so this alert is too; a regular
// User's appeal has no equivalent notification today, same as before this feature). name/email/
// message are escaped: message is free-text the Support account itself types.
exports.supportAppealSubmittedTemplate = (name, email, message) => {
  name = escapeHtml(name)
  email = escapeHtml(email)
  message = escapeHtml(message)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Support Appeal Submitted – Resume Enhancer</title>
</head>
<body style="margin:0;padding:0;background-color:#0D1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background-color:#161D29;border-radius:20px;
                 overflow:hidden;border:1px solid #2C333F;">

          <tr>
            <td style="background:linear-gradient(90deg,#F59E0B,#D97706);height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:36px 48px 28px;text-align:center;background:#1C2130;">
              <div style="font-size:28px;font-weight:800;color:#FFD60A;letter-spacing:3px;
                          text-transform:uppercase;">Resume Enhancer</div>
              <div style="font-size:12px;color:#6B7280;margin-top:5px;letter-spacing:2px;
                          text-transform:uppercase;">Admin Alert</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px;">

              <h1 style="margin:0 0 10px;text-align:center;font-size:22px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                A Support account has submitted its one appeal
              </h1>
              <p style="margin:0 0 24px;text-align:center;color:#9CA3AF;font-size:14px;line-height:1.6;">
                ${name} (${email}) has used their one and only appeal for this suspension.
                Review it in the Admin dashboard's Users page.
              </p>

              <div style="background:#F59E0B10;border-radius:12px;padding:16px 20px;
                          border:1px solid #F59E0B30;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#FCD34D;
                          text-transform:uppercase;letter-spacing:1px;">Their message</p>
                <p style="margin:0;font-size:14px;color:#F9FAFB;white-space:pre-wrap;">${message}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 48px 32px;text-align:center;background:#1C2130;
                       border-top:1px solid #2C333F;">
              <p style="margin:0;font-size:12px;color:#374151;">
                © ${new Date().getFullYear()} Resume Enhancer. All rights reserved.
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
