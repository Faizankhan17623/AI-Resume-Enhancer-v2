const { escapeHtml } = require('../utils/escapeHtml')

// sent to the OLD address right after updateEmail succeeds sir — same visual shell as
// DeleteAccount.js/passwordResetTemplate.js, one look for every security email. This is the
// only notice an account owner gets if their email was changed by someone who stole their
// session token rather than by them — there's no "undo" link since the old address is no
// longer attached to the account, only a pointer to support.
exports.emailChangedTemplate = (firstName, newEmail) => {
  firstName = escapeHtml(firstName)
  newEmail = escapeHtml(newEmail)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Email Was Changed – Resume Enhancer</title>
</head>
<body style="margin:0;padding:0;background-color:#0D1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background-color:#161D29;border-radius:20px;
                 overflow:hidden;border:1px solid #2C333F;">

          <!-- Top accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#F59E0B,#EF4444);height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:36px 48px 28px;text-align:center;background:#1C2130;">
              <div style="font-size:28px;font-weight:800;color:#FFD60A;letter-spacing:3px;
                          text-transform:uppercase;">Resume Enhancer</div>
              <div style="font-size:12px;color:#6B7280;margin-top:5px;letter-spacing:2px;
                          text-transform:uppercase;">Build a Stronger Resume</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">

              <!-- Icon -->
              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;width:72px;height:72px;border-radius:50%;
                            background:#F59E0B1A;border:2px solid #F59E0B;
                            line-height:72px;font-size:32px;text-align:center;">
                  🛡️
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                Your Account Email Was Changed
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi <strong style="color:#F9FAFB;white-space:nowrap;">${firstName}</strong>,
                the email on your Resumify account was just changed to
                <strong style="color:#F9FAFB;">${newEmail}</strong>. This address will no
                longer receive sign-in or notification emails for this account.
              </p>

              <!-- Security notice -->
              <div style="background:#EF444410;border-radius:12px;padding:16px 20px;
                          border:1px solid #EF444430;text-align:center;">
                <span style="font-size:13px;color:#FCA5A5;">
                  🔒 If you didn't make this change, your account may be compromised —
                  contact support immediately so we can secure it.
                </span>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 32px;text-align:center;background:#1C2130;
                       border-top:1px solid #2C333F;">
              <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">
                Need help?&nbsp;
                <a href="mailto:support@resumeenhancer.com"
                   style="color:#FFD60A;text-decoration:none;">support@resumeenhancer.com</a>
              </p>
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
