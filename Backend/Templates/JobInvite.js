const { escapeHtml } = require('../utils/escapeHtml')

// sent when a recruiter invites a specific email to an invite_only job sir (see
// controllers/JobInvite.js's sendJobInvite) — same visual language as testInviteTemplate.js,
// different body text: this invites someone to APPLY, not to take a test.
exports.jobInviteTemplate = (jobTitle, companyName, inviteUrl) => {
  jobTitle = escapeHtml(jobTitle)
  companyName = escapeHtml(companyName)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You're Invited to Apply – Resumify</title>
</head>
<body style="margin:0;padding:0;background-color:#0D1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background-color:#161D29;border-radius:20px;
                 overflow:hidden;border:1px solid #2C333F;">

          <tr>
            <td style="background:linear-gradient(90deg,#8B5CF6,#6366F1);height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:#8B5CF61A;border:2px solid #8B5CF6;
                            line-height:72px;font-size:32px;text-align:center;">
                  ✉️
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                You're invited to apply
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                <strong style="color:#F9FAFB;">${companyName}</strong> would like to invite you to apply for the
                <strong style="color:#F9FAFB;">${jobTitle}</strong> role. This is a private listing —
                only invited candidates can view and apply to it.
              </p>

              <div style="text-align:center;margin:0 0 28px;">
                <a href="${inviteUrl}" target="_blank" style="display:inline-block;background:#FFD60A;color:#111827;
                   font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;
                   border-radius:9999px;">
                  View the role and apply →
                </a>
              </div>

              <div style="background:#0D1117;border-radius:12px;padding:16px 20px;
                          border:1px solid #2C333F;">
                <p style="margin:0 0 8px;font-size:12px;color:#6B7280;">
                  Button not working? Paste this link into your browser:
                </p>
                <a href="${inviteUrl}" target="_blank"
                   style="font-size:12px;color:#A78BFA;word-break:break-all;text-decoration:none;">
                  ${inviteUrl}
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
