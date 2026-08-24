const { escapeHtml } = require('../utils/escapeHtml')

// sent to the REFERRER once, right when their invite pays out (see controllers/user.js's
// grantReferralBonus) sir — bonusCredits is 0 for a Recruiter referrer (see ReferralLog.js), the
// copy below adapts so it never claims credits that weren't actually granted.
//
// referrerName/referredName are escaped sir — both ultimately come from a User's firstName/
// lastName, which Zod only length-checks (Validation/schemas.js), never strips HTML from. An
// unauthenticated signup with an HTML/link payload as their name would otherwise land unescaped
// in this email, sent to a THIRD PARTY (their referrer) from a real support@ address — found
// live during a security review, this is the fix.
exports.referralSuccessTemplate = (referrerName, referredName, bonusCredits, grantedAt) => {
  referrerName = escapeHtml(referrerName)
  referredName = escapeHtml(referredName)
  const grantedDate = new Date(grantedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const bonusLine = bonusCredits > 0
    ? `<strong style="color:#F9FAFB;">${bonusCredits} bonus AI credits</strong> were added to your account on <strong style="color:#F9FAFB;">${grantedDate}</strong>.`
    : `Thanks for growing Resumify! Bonus credits are a Basic/Pro/Pro Max feature, so this invite doesn't carry a credit reward on your account type — but it still counts on your referral dashboard.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Invite Was Successful – Resume Enhancer</title>
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
            <td style="background:linear-gradient(90deg,#FFD60A,#F59E0B);height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:#FFD60A1A;border:2px solid #FFD60A;
                            line-height:72px;font-size:32px;text-align:center;">
                  🎉
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                Your invite was successful, ${referrerName}!
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                <strong style="color:#F9FAFB;">${referredName}</strong> just created a Resumify
                account using your referral link. ${bonusLine}
              </p>

              <div style="background:#FFD60A10;border-radius:12px;padding:16px 20px;
                          border:1px solid #FFD60A30;text-align:center;">
                <span style="font-size:14px;color:#FDE68A;">
                  ✨ Keep sharing your link — check your Account page for the full referral dashboard.
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
