const { escapeHtml } = require('../utils/escapeHtml')

// sent when an admin grants bonus credits sir — controllers/Admin.js's adjustCredits (single
// user, negative delta only) and grantCreditsToAll (broadcast). Deliberately does NOT fire for a
// positive delta (a charge/correction, not a gift) — see the isBonus check at each call site.
//
// name/reason are escaped sir — name is the recipient's own firstName (Zod only length-checks
// it, never strips HTML), and reason is free-text an admin/support staffer types into the
// dialog. Neither was HTML-escaped before reaching this template: a compromised or careless
// Support account could inject arbitrary HTML/links into an email sent to one user, or — via the
// grantCreditsToAll broadcast — to every User account in a single call. Found live during a
// security review, this is the fix.
exports.creditBonusTemplate = (name, credits, reason) => {
  name = escapeHtml(name)
  reason = escapeHtml(reason)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've Received Bonus Credits – Resume Enhancer</title>
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
                          text-transform:uppercase;">Resume Enhancer</div>
              <div style="font-size:12px;color:#6B7280;margin-top:5px;letter-spacing:2px;
                          text-transform:uppercase;">Build a Stronger Resume</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">

              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;width:72px;height:72px;border-radius:50%;
                            background:#10B9811A;border:2px solid #10B981;
                            line-height:72px;font-size:32px;text-align:center;">
                  🎁
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                You've received bonus credits, ${name}!
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                An administrator has added
                <strong style="color:#F9FAFB;">${credits} bonus AI credit${credits === 1 ? '' : 's'}</strong>
                to your account.${reason ? ` <em>${reason}</em>` : ''}
              </p>

              <div style="background:#10B98110;border-radius:12px;padding:16px 20px;
                          border:1px solid #10B98130;text-align:center;">
                <span style="font-size:14px;color:#A7F3D0;">
                  ✨ Head over to your Account page to see your updated credit balance.
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
