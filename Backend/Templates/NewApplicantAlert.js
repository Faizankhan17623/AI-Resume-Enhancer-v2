const { escapeHtml } = require('../utils/escapeHtml')

// sent to a recruiter the moment a candidate applies to one of their jobs sir — the only
// Recruiter-facing email that exists so far (see Backend/Models/User.js's notifyNewApplicant and
// controllers/Job.js's applyToJob, which fires this). Same dark-theme table layout as the
// User-facing templates (CreditBonus.js etc), just with a Recruiter-relevant accent color/icon.
//
// recruiterName/candidateName/jobTitle are all escaped sir — candidateName in particular is the
// APPLICANT's own firstName/lastName, someone the recruiter has no control over, so it must never
// be trusted as safe HTML (same reasoning CreditBonus.js documents for its own interpolated name).
exports.newApplicantAlertTemplate = (recruiterName, candidateName, jobTitle, applicantsUrl, accountUrl) => {
  recruiterName = escapeHtml(recruiterName)
  candidateName = escapeHtml(candidateName)
  jobTitle = escapeHtml(jobTitle)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Applicant – Resumify Recruiter</title>
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
            <td style="background:linear-gradient(90deg,#3B82F6,#2563EB);height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:36px 48px 28px;text-align:center;background:#1C2130;">
              <div style="font-size:28px;font-weight:800;color:#FFD60A;letter-spacing:3px;
                          text-transform:uppercase;">Resumify</div>
              <div style="font-size:12px;color:#6B7280;margin-top:5px;letter-spacing:2px;
                          text-transform:uppercase;">Recruiter</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">

              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;width:72px;height:72px;border-radius:50%;
                            background:#3B82F61A;border:2px solid #3B82F6;
                            line-height:72px;font-size:32px;text-align:center;">
                  📋
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                New applicant, ${recruiterName}!
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                <strong style="color:#F9FAFB;">${candidateName}</strong> just applied to
                <strong style="color:#F9FAFB;">${jobTitle}</strong>.
              </p>

              <div style="background:#3B82F610;border-radius:12px;padding:16px 20px;
                          border:1px solid #3B82F630;text-align:center;">
                <a href="${applicantsUrl}" style="color:#93C5FD;font-size:14px;font-weight:600;text-decoration:none;">
                  View this candidate's application →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 32px;text-align:center;background:#1C2130;
                       border-top:1px solid #2C333F;">
              <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">
                You're receiving this because email notifications are on for new applicants.
                Manage this in your <a href="${accountUrl}"
                style="color:#FFD60A;text-decoration:none;">Account settings</a>.
              </p>
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
