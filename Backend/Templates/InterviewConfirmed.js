const { escapeHtml } = require('../utils/escapeHtml')

// sent to BOTH the candidate and the recruiter the moment a slot is confirmed sir (see
// controllers/Interview.js's confirmSlot) — one shared function since the shape is identical for
// both recipients, only the greeting name and (for the recruiter's copy) a small "who confirmed"
// line differ. The .ics file is attached by the caller (utils/icsGenerator.js), not built here.
exports.interviewConfirmedTemplate = (recipientName, jobTitle, companyName, whenLabel, meetingLink, isRecruiterCopy, candidateName) => {
  recipientName = escapeHtml(recipientName)
  jobTitle = escapeHtml(jobTitle)
  companyName = escapeHtml(companyName)
  whenLabel = escapeHtml(whenLabel)
  candidateName = escapeHtml(candidateName || '')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Interview Confirmed – Resumify</title>
</head>
<body style="margin:0;padding:0;background-color:#0D1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background-color:#161D29;border-radius:20px;
                 overflow:hidden;border:1px solid #2C333F;">

          <tr>
            <td style="background:linear-gradient(90deg,#10B981,#059669);height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:#10B9811A;border:2px solid #10B981;
                            line-height:72px;font-size:32px;text-align:center;">
                  ✅
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                Interview confirmed
              </h1>
              <p style="margin:0 0 24px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi <strong style="color:#F9FAFB;">${recipientName}</strong>,
                ${isRecruiterCopy
                  ? `<strong style="color:#F9FAFB;">${candidateName}</strong> confirmed a time for the`
                  : 'your interview for the'}
                <strong style="color:#F9FAFB;">${jobTitle}</strong> role at
                <strong style="color:#F9FAFB;">${companyName}</strong> is confirmed. A calendar
                invite is attached to this email.
              </p>

              <div style="background:#0D1117;border-radius:12px;padding:20px 24px;
                          border:1px solid #2C333F;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">When</td>
                      <td style="padding:4px 0;font-size:13px;color:#F9FAFB;text-align:right;">${whenLabel}</td></tr>
                  ${meetingLink ? `<tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">Link</td>
                      <td style="padding:4px 0;font-size:13px;text-align:right;">
                        <a href="${escapeHtml(meetingLink)}" style="color:#A78BFA;text-decoration:none;word-break:break-all;">${escapeHtml(meetingLink)}</a>
                      </td></tr>` : ''}
                </table>
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
