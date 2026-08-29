const { escapeHtml } = require('../utils/escapeHtml')

// sent once, ~1 hour before a candidate's 5-hour test-invite window closes sir (see
// utils/TestInviteReminderCron.js) — per direct request, to cut the "forgot and missed it" rate
// that TestInviteExpiryCron.js's whole invite_expired status exists to handle gracefully in the
// first place. Same layout/theme as TestInvite.js, urgent-amber accent instead of green so it
// reads as a reminder, not a fresh invite. candidateName/jobTitle/companyName all escaped, same
// reasoning as every other template here.
exports.testInviteReminderTemplate = (candidateName, jobTitle, companyName, testUrl, timeLimitMinutes) => {
  candidateName = escapeHtml(candidateName)
  jobTitle = escapeHtml(jobTitle)
  companyName = escapeHtml(companyName)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Test Invite Expires Soon – Resumify</title>
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
            <td style="background:linear-gradient(90deg,#F59E0B,#D97706);height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:36px 48px 28px;text-align:center;background:#1C2130;">
              <div style="font-size:28px;font-weight:800;color:#FFD60A;letter-spacing:3px;
                          text-transform:uppercase;">Resumify</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">

              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;width:72px;height:72px;border-radius:50%;
                            background:#F59E0B1A;border:2px solid #F59E0B;
                            line-height:72px;font-size:32px;text-align:center;">
                  ⏰
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                Your test invite expires in about an hour
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi ${candidateName}, you were invited to take a proctored test for the
                <strong style="color:#F9FAFB;">${jobTitle}</strong> role at
                <strong style="color:#F9FAFB;">${companyName}</strong>${timeLimitMinutes ? ` (about ${timeLimitMinutes} minutes)` : ''}.
                This invite will expire soon — start now if you still want to take it.
              </p>

              <div style="text-align:center;margin:0 0 28px;">
                <a href="${testUrl}" target="_blank" style="display:inline-block;background:#FFD60A;color:#111827;
                   font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;
                   border-radius:9999px;">
                  Start the test now →
                </a>
              </div>

              <!-- Fallback link sir — same reasoning as TestInvite.js's own -->
              <div style="background:#0D1117;border-radius:12px;padding:16px 20px;
                          border:1px solid #2C333F;">
                <p style="margin:0 0 8px;font-size:12px;color:#6B7280;">
                  Button not working? Paste this link into your browser:
                </p>
                <a href="${testUrl}" target="_blank"
                   style="font-size:12px;color:#FCD34D;word-break:break-all;text-decoration:none;">
                  ${testUrl}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
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
