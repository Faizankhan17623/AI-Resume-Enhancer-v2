const { escapeHtml } = require('../utils/escapeHtml')

// sent to a candidate the moment a recruiter invites them to a job's proctored test sir (see
// controllers/Job.js's inviteApplicantToTest / bulkInviteApplicantsToTest). Previously NOTHING was
// ever sent for this — the candidate only found out by checking their own dashboard. candidateName/
// jobTitle/companyName are all escaped, same reasoning as every other template here.
exports.testInviteTemplate = (candidateName, jobTitle, companyName, testUrl, timeLimitMinutes) => {
  candidateName = escapeHtml(candidateName)
  jobTitle = escapeHtml(jobTitle)
  companyName = escapeHtml(companyName)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You're Invited to a Test – Resumify</title>
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
            <td style="background:linear-gradient(90deg,#10B981,#059669);height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:#10B9811A;border:2px solid #10B981;
                            line-height:72px;font-size:32px;text-align:center;">
                  🎯
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                You're invited to test, ${candidateName}!
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                <strong style="color:#F9FAFB;">${companyName}</strong> would like you to complete a
                short proctored test for the <strong style="color:#F9FAFB;">${jobTitle}</strong>
                role${timeLimitMinutes ? ` (about ${timeLimitMinutes} minutes)` : ''}. This test can
                only be attempted <strong style="color:#F9FAFB;">once</strong>, so make sure you're
                ready — quiet space, working webcam, stable connection — before you start.
              </p>

              <div style="text-align:center;">
                <a href="${testUrl}" style="display:inline-block;background:#FFD60A;color:#111827;
                   font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;
                   border-radius:9999px;">
                  Start the test →
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
