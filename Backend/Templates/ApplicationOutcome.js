const { escapeHtml } = require('../utils/escapeHtml')

// sent to the candidate the moment a recruiter marks their application hired or rejected sir (see
// controllers/Job.js's setApplicationOutcome / bulkSetApplicationOutcome) — previously NOTHING was
// ever sent for this either, same gap as the test-invite email before it. candidateName/jobTitle/
// companyName are all escaped, same reasoning as every other template here.
//
// hired and rejected share one template (not two files) sir since the shape is identical end to
// end — only the icon/color/copy differ, same pattern as passwordResetTemplate's single function
// covering its one flow; a second near-duplicate file would just drift from this one over time.
exports.applicationOutcomeTemplate = (candidateName, jobTitle, companyName, hired) => {
  candidateName = escapeHtml(candidateName)
  jobTitle = escapeHtml(jobTitle)
  companyName = escapeHtml(companyName)

  const accent = hired ? '#10B981' : '#6B7280'
  const accentGradientEnd = hired ? '#059669' : '#4B5563'
  const icon = hired ? '🎉' : '📩'
  const title = hired ? `Congratulations, ${candidateName}!` : `Update on your application`
  const body = hired
    ? `<strong style="color:#F9FAFB;">${companyName}</strong> has reviewed your application for the
       <strong style="color:#F9FAFB;">${jobTitle}</strong> role and would like to move forward with
       you. They'll be in touch with next steps directly.`
    : `Thank you for taking the time to apply for the <strong style="color:#F9FAFB;">${jobTitle}</strong>
       role at <strong style="color:#F9FAFB;">${companyName}</strong>. After reviewing your
       application, they've decided not to move forward with you for this particular role. This
       isn't a reflection of your overall potential — we'd encourage you to keep applying to roles
       that fit.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${hired ? "You're Hired" : 'Application Update'} – Resumify</title>
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
            <td style="background:linear-gradient(90deg,${accent},${accentGradientEnd});height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:${accent}1A;border:2px solid ${accent};
                            line-height:72px;font-size:32px;text-align:center;">
                  ${icon}
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                ${title}
              </h1>
              <p style="margin:0;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                ${body}
              </p>
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
