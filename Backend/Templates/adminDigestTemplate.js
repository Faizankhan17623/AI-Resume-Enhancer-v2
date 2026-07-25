// counts: [{ action: 'ROLE_CHANGE', count: 3 }, ...] sir — already sorted by the cron
exports.adminDigestTemplate = (name, { counts, totalActions, weekStart, weekEnd }) => {
  const rows = counts.map((c) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2C333F;color:#F9FAFB;font-size:14px;">${c.action.replace(/_/g, ' ')}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2C333F;color:#9CA3AF;font-size:14px;text-align:right;">${c.count}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Weekly Admin Digest – Resume Enhancer</title>
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
            <td style="background:linear-gradient(90deg,#8B5CF6,#6366F1);height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:#8B5CF61A;border:2px solid #8B5CF6;
                            line-height:72px;font-size:32px;text-align:center;">
                  📋
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                Your Weekly Admin Digest
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi <strong style="color:#F9FAFB;">${name}</strong>, here's what happened on
                Resume Enhancer between <strong style="color:#F9FAFB;">${weekStart}</strong> and
                <strong style="color:#F9FAFB;">${weekEnd}</strong>.
              </p>

              ${totalActions === 0 ? `
              <div style="background:#0D1117;border-radius:12px;padding:20px;text-align:center;
                          border:1px solid #2C333F;">
                <span style="font-size:14px;color:#9CA3AF;">No admin actions were logged this week.</span>
              </div>
              ` : `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="padding-bottom:8px;color:#6B7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Action</td>
                  <td style="padding-bottom:8px;color:#6B7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;text-align:right;">Count</td>
                </tr>
                ${rows}
              </table>
              <p style="margin:0;text-align:center;color:#9CA3AF;font-size:13px;">
                ${totalActions} total action${totalActions === 1 ? '' : 's'} this week.
              </p>
              `}

              <!-- Notice -->
              <div style="background:#8B5CF610;border-radius:12px;padding:16px 20px;margin-top:24px;
                          border:1px solid #8B5CF630;text-align:center;">
                <span style="font-size:14px;color:#C4B5FD;">
                  🔍 See the full detail any time in the Admin Dashboard's Audit Log.
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
