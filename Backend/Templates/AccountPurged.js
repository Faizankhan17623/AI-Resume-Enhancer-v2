// the FINAL confirmation sir — sent once purgeExpiredAccounts (AccountPurgeCron.js) has actually
// deleted the account, not the earlier "scheduled for deletion" notice (see DeleteAccount.js,
// sent when the 2-day recovery window STARTS). Same visual language as that template, but no
// recovery notice — this action is irreversible and the email says so.
exports.accountPurgedEmail = (email, firstName, lastName) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Account Permanently Deleted – Resume Enhancer</title>
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
            <td style="background:linear-gradient(90deg,#6B7280,#374151);height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:#6B72801A;border:2px solid #6B7280;
                            line-height:72px;font-size:32px;text-align:center;">
                  🗑️
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                Your Account Has Been Permanently Deleted
              </h1>
              <p style="margin:0 0 32px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Hi <strong style="color:#F9FAFB;white-space:nowrap;">${firstName}&nbsp;${lastName}</strong>,
                the 2-day recovery window on your account has ended. As requested, your account
                and its data have now been <strong style="color:#F9FAFB;">permanently deleted</strong>.
                This cannot be undone.
              </p>

              <!-- Account details -->
              <div style="background:#0D1117;border-radius:14px;overflow:hidden;margin:0 0 28px;
                          border:1px solid #2C333F;">
                <div style="padding:12px 20px;background:#1C2130;border-bottom:1px solid #2C333F;">
                  <span style="font-size:11px;font-weight:700;color:#9CA3AF;letter-spacing:2px;
                               text-transform:uppercase;">
                    Deleted Account
                  </span>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:13px 20px;width:40%;">
                      <span style="font-size:13px;color:#6B7280;">Account Email</span>
                    </td>
                    <td style="padding:13px 20px;">
                      <span style="font-size:13px;color:#F9FAFB;">${email}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin:0;text-align:center;color:#6B7280;font-size:13px;line-height:1.65;">
                Want to use Resumify again? You're welcome to sign up for a brand new account
                any time.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 32px;text-align:center;background:#1C2130;
                       border-top:1px solid #2C333F;">
              <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">
                Questions?&nbsp;
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
