// same visual language as passwordResetTemplate.js sir — one look for every security email
exports.newDeviceAlertTemplate = (name, { browserLabel, osLabel, location, ip, when }, confirmUrl, denyUrl) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Sign-In Detected – Resume Enhancer</title>
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
            <td style="background:linear-gradient(90deg,#F59E0B,#EF4444);height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:#F59E0B1A;border:2px solid #F59E0B;
                            line-height:72px;font-size:32px;text-align:center;">
                  🛡️
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                New Sign-In Detected
              </h1>
              <p style="margin:0 0 28px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi <strong style="color:#F9FAFB;white-space:nowrap;">${name}</strong>,
                your account was just signed in to from a device we haven't seen before.
              </p>

              <!-- Device details -->
              <div style="background:#0D1117;border-radius:12px;padding:20px 24px;margin:0 0 28px;
                          border:1px solid #2C333F;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">Device</td>
                      <td style="padding:4px 0;font-size:13px;color:#F9FAFB;text-align:right;">${browserLabel} on ${osLabel}</td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">Location</td>
                      <td style="padding:4px 0;font-size:13px;color:#F9FAFB;text-align:right;">${location || 'Unknown'}</td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">IP address</td>
                      <td style="padding:4px 0;font-size:13px;color:#F9FAFB;text-align:right;">${ip || 'Unknown'}</td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">Time</td>
                      <td style="padding:4px 0;font-size:13px;color:#F9FAFB;text-align:right;">${when}</td></tr>
                </table>
              </div>

              <p style="margin:0 0 20px;text-align:center;color:#9CA3AF;font-size:14px;line-height:1.6;">
                Was this you?
              </p>

              <!-- Two buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right:8px;">
                    <a href="${confirmUrl}" target="_blank"
                       style="display:block;text-align:center;padding:14px 12px;border-radius:12px;
                              background:#10B98120;border:1px solid #10B981;
                              color:#6EE7B7;font-size:14px;font-weight:700;text-decoration:none;">
                      ✓ Yes, that was me
                    </a>
                  </td>
                  <td width="50%" style="padding-left:8px;">
                    <a href="${denyUrl}" target="_blank"
                       style="display:block;text-align:center;padding:14px 12px;border-radius:12px;
                              background:#EF444420;border:1px solid #EF4444;
                              color:#FCA5A5;font-size:14px;font-weight:700;text-decoration:none;">
                      ✕ No, secure my account
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <div style="margin-top:28px;background:#F59E0B10;border-radius:12px;padding:16px 20px;
                          border:1px solid #F59E0B30;text-align:center;">
                <span style="font-size:13px;color:#FCD34D;">
                  🔒 If this wasn't you, click "secure my account" — we'll email you a link to
                  reset your password, and every other device will be signed out the moment you do.
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
