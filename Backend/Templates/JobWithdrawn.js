const { escapeHtml } = require('../utils/escapeHtml')

// sent to every candidate who had applied to a job the recruiter just deleted sir (see
// controllers/Job.js's deleteJob). candidateName/jobTitle/companyName are escaped — jobTitle and
// companyName are recruiter-controlled free text, candidateName is the applicant's own name; none
// of the three are trusted as safe HTML, same reasoning every other template here documents.
exports.jobWithdrawnTemplate = (candidateName, jobTitle, companyName, jobsUrl) => {
  candidateName = escapeHtml(candidateName)
  jobTitle = escapeHtml(jobTitle)
  companyName = escapeHtml(companyName)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Job Posting Withdrawn – Resumify</title>
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
                  ⚠️
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                A job you applied to was withdrawn
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi ${candidateName}, <strong style="color:#F9FAFB;">${companyName}</strong> has
                withdrawn the <strong style="color:#F9FAFB;">${jobTitle}</strong> posting you
                applied to. No further action is needed from you — your application for this role
                is closed.
              </p>

              <div style="background:#F59E0B10;border-radius:12px;padding:16px 20px;
                          border:1px solid #F59E0B30;text-align:center;">
                <a href="${jobsUrl}" style="color:#FCD34D;font-size:14px;font-weight:600;text-decoration:none;">
                  Browse other open roles →
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
