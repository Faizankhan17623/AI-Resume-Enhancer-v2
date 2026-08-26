const { escapeHtml } = require('../utils/escapeHtml')

// sent the moment a Support account is suspended sir — controllers/Admin.js's banUser, only for
// role: 'Support' (a regular User's suspension has no equivalent email today; this is new,
// scoped to Support per the one-way/suspend-only policy that role now has). name/reason are
// escaped: reason is free-text an Admin types into the ban dialog, same injection risk
// CreditBonus.js's template already guards against.
exports.supportSuspendedTemplate = (name, reason) => {
  name = escapeHtml(name)
  reason = escapeHtml(reason)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Support Account Has Been Suspended – Resume Enhancer</title>
</head>
<body style="margin:0;padding:0;background-color:#0D1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background-color:#161D29;border-radius:20px;
                 overflow:hidden;border:1px solid #2C333F;">

          <tr>
            <td style="background:linear-gradient(90deg,#DC2626,#B91C1C);height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:36px 48px 28px;text-align:center;background:#1C2130;">
              <div style="font-size:28px;font-weight:800;color:#FFD60A;letter-spacing:3px;
                          text-transform:uppercase;">Resume Enhancer</div>
              <div style="font-size:12px;color:#6B7280;margin-top:5px;letter-spacing:2px;
                          text-transform:uppercase;">Build a Stronger Resume</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px;">

              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;width:72px;height:72px;border-radius:50%;
                            background:#DC26261A;border:2px solid #DC2626;
                            line-height:72px;font-size:32px;text-align:center;">
                  🔒
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                Hi ${name}, your Support account has been suspended
              </h1>
              <p style="margin:0 0 20px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                An administrator has suspended your access to the Support dashboard.
              </p>

              <div style="background:#DC262610;border-radius:12px;padding:16px 20px;
                          border:1px solid #DC262630;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#FCA5A5;
                          text-transform:uppercase;letter-spacing:1px;">Reason given</p>
                <p style="margin:0;font-size:14px;color:#F9FAFB;">${reason}</p>
              </div>

              <p style="margin:0;text-align:center;color:#9CA3AF;font-size:14px;line-height:1.65;">
                You get exactly <strong style="color:#F9FAFB;">one appeal</strong> for this
                suspension. Sign in and go to your account to submit it — make it count, there's
                no second attempt.
              </p>
            </td>
          </tr>

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
