const { escapeHtml } = require('../utils/escapeHtml')

// sent at 7/3/1 days before a paid plan's SubscriptionExpires, and once more the day it actually
// expires sir — see utils/PlanExpiryReminderCron.js. `daysLeft` is 7, 3, 1, or 0 (0 = expired
// today); the copy/accent color shifts from calm (7) to urgent (0), same "escalate as the
// deadline nears" idea already used elsewhere (TestInviteReminder.js's single amber reminder).
// firstName/planName all escaped, same reasoning as every other template here.
exports.planExpiryReminderTemplate = (firstName, planName, daysLeft, expiryDateFormatted, pricingUrl) => {
  firstName = escapeHtml(firstName)
  planName = escapeHtml(planName)

  const isExpiredToday = daysLeft === 0
  const accent = isExpiredToday ? '#EF4444' : daysLeft === 1 ? '#F59E0B' : '#FFD60A'
  const accentGradient = isExpiredToday ? 'linear-gradient(90deg,#EF4444,#B91C1C)' : 'linear-gradient(90deg,#F59E0B,#D97706)'
  const icon = isExpiredToday ? '⚠️' : '⏳'

  const heading = isExpiredToday
    ? `Your ${planName} plan has expired`
    : `Your ${planName} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`

  const body = isExpiredToday
    ? `Hi ${firstName}, your <strong style="color:#F9FAFB;">${planName}</strong> plan expired on
       <strong style="color:#F9FAFB;">${expiryDateFormatted}</strong>. Your account is now on the
       free Basic plan. Resubscribe any time to get your limits and features back.`
    : `Hi ${firstName}, your <strong style="color:#F9FAFB;">${planName}</strong> plan expires on
       <strong style="color:#F9FAFB;">${expiryDateFormatted}</strong> — that's ${daysLeft} day${daysLeft === 1 ? '' : 's'}
       from now. Renew before then to keep your limits and features without any interruption.`

  const ctaText = isExpiredToday ? 'Resubscribe now →' : 'Renew your plan →'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(heading)} – Resumify</title>
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
            <td style="background:${accentGradient};height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                ${heading}
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                ${body}
              </p>

              <div style="text-align:center;margin:0 0 8px;">
                <a href="${pricingUrl}" target="_blank" style="display:inline-block;background:#FFD60A;color:#111827;
                   font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;
                   border-radius:9999px;">
                  ${ctaText}
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
