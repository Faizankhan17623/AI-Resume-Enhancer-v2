exports.otpEmail = (otp) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Verification Code – Resume Enhancer</title>
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
            <td style="background:linear-gradient(90deg,#06B6D4,#0284C7);height:5px;font-size:0;line-height:0;">&nbsp;</td>
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
                            background:#06B6D41A;border:2px solid #06B6D4;
                            line-height:72px;font-size:32px;text-align:center;">
                  🔐
                </div>
              </div>

              <h1 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;
                         color:#F9FAFB;line-height:1.3;">
                Verify Your Email
              </h1>
              <p style="margin:0 0 32px;text-align:center;color:#9CA3AF;font-size:15px;line-height:1.65;">
                Use the verification code below to complete your sign-up.
                This code is valid for the next <strong style="color:#F9FAFB;">2 minutes</strong>.
              </p>

              <!-- OTP box -->
              <div style="background:#0D1117;border-radius:14px;padding:28px 20px;margin:0 0 28px;
                          border:1px solid #2C333F;text-align:center;">
                <div style="font-size:11px;font-weight:700;color:#06B6D4;letter-spacing:2px;
                            text-transform:uppercase;margin-bottom:14px;">
                  Your Verification Code
                </div>
                <div style="font-size:38px;font-weight:800;color:#F9FAFB;letter-spacing:12px;
                            font-family:'Courier New',monospace;">
                  ${otp}
                </div>
              </div>

              <!-- Security notice -->
              <div style="background:#06B6D410;border-radius:12px;padding:16px 20px;
                          border:1px solid #06B6D430;text-align:center;">
                <span style="font-size:14px;color:#67E8F9;">
                  🔒 Never share this code with anyone. Our team will
                  <strong style="color:#F9FAFB;">never</strong> ask you for it.
                </span>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 32px;text-align:center;background:#1C2130;
                       border-top:1px solid #2C333F;">
              <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">
                Didn't request this?&nbsp;
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
