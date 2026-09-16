const { escapeHtml } = require('../utils/escapeHtml')

// sent to the candidate the moment a recruiter proposes interview slots sir (see
// controllers/Interview.js's scheduleInterview). candidateName/jobTitle/companyName are all
// escaped, same reasoning as every other template here — slots are Date objects the caller
// formats before this template ever sees them, never raw user input.
exports.interviewProposedTemplate = (candidateName, jobTitle, companyName, slots, confirmUrl) => {
  candidateName = escapeHtml(candidateName)
  jobTitle = escapeHtml(jobTitle)
  companyName = escapeHtml(companyName)

  const slotRows = slots.map((label) => `
    <div style="background:#0D1117;border-radius:10px;padding:12px 18px;margin-bottom:8px;
                border:1px solid #2C333F;font-size:14px;color:#F9FAFB;">
      🗓️ ${escapeHtml(label)}
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Interview Slots Proposed – Resumify</title>
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
                  📅
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                You're invited to interview
              </h1>
              <p style="margin:0 0 24px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi <strong style="color:#F9FAFB;">${candidateName}</strong>,
                <strong style="color:#F9FAFB;">${companyName}</strong> would like to interview you
                for the <strong style="color:#F9FAFB;">${jobTitle}</strong> role. Please pick one
                of the times below:
              </p>

              ${slotRows}

              <div style="text-align:center;margin:28px 0 0;">
                <a href="${confirmUrl}" target="_blank"
                   style="display:inline-block;padding:15px 44px;border-radius:12px;
                          background:linear-gradient(90deg,#8B5CF6,#6366F1);
                          color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;
                          letter-spacing:0.5px;">
                  Choose a time
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
