// welcome email sir — sent once, right after createUser succeeds (controllers/user.js). Table-
// based layout with every style inline, same convention as Templates/OTP.js: most email clients
// (Outlook especially) strip <style> blocks and don't support modern CSS, so this is the only
// markup shape that renders consistently everywhere. Colors pulled from the real current app
// palette (ResumeEnhancer/src/index.css) rather than OTP.js's older cyan/yellow pair, so this
// actually matches what the user just saw in the product.
exports.welcomeEmail = (firstName, loginUrl) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Resumify</title>
</head>
<body style="margin:0;padding:0;background-color:#17140F;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#17140F;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background-color:#1F1C16;border-radius:20px;
                 overflow:hidden;border:1px solid #3A3428;">

          <!-- Top accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#E8834F,#2F6F5E);height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:40px 48px 8px;text-align:center;">
              <div style="font-size:26px;font-weight:800;color:#F3EFE6;letter-spacing:0.5px;">
                Resum<span style="color:#E8834F;">ify</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 48px 40px;">

              <!-- Icon -->
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;width:72px;height:72px;border-radius:50%;
                            background:#2F6F5E26;border:2px solid #6FBFA8;
                            line-height:72px;font-size:32px;text-align:center;">
                  🎉
                </div>
              </div>

              <h1 style="margin:0 0 12px;text-align:center;font-size:26px;font-weight:700;
                         color:#F3EFE6;line-height:1.3;">
                Welcome aboard, ${firstName}
              </h1>
              <p style="margin:0 0 32px;text-align:center;color:#A79D8A;font-size:15px;line-height:1.65;">
                Your account is ready. Here's what you can do first.
              </p>

              <!-- Feature list -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding:16px 20px;background:#17140F;border-radius:14px;border:1px solid #3A3428;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="44" valign="top">
                          <div style="width:36px;height:36px;border-radius:10px;background:#2F6F5E26;
                                      text-align:center;line-height:36px;font-size:17px;">📄</div>
                        </td>
                        <td valign="top" style="padding-left:14px;">
                          <div style="font-size:15px;font-weight:600;color:#F3EFE6;margin-bottom:3px;">
                            Upload your resume
                          </div>
                          <div style="font-size:13px;color:#8A8271;line-height:1.5;">
                            Get an honest ATS score with a category breakdown in seconds.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:16px 20px;background:#17140F;border-radius:14px;border:1px solid #3A3428;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="44" valign="top">
                          <div style="width:36px;height:36px;border-radius:10px;background:#E8834F26;
                                      text-align:center;line-height:36px;font-size:17px;">✨</div>
                        </td>
                        <td valign="top" style="padding-left:14px;">
                          <div style="font-size:15px;font-weight:600;color:#F3EFE6;margin-bottom:3px;">
                            Fix the top 3 gaps
                          </div>
                          <div style="font-size:13px;color:#8A8271;line-height:1.5;">
                            Every review comes with before/after fixes you can apply right away.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:16px 20px;background:#17140F;border-radius:14px;border:1px solid #3A3428;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="44" valign="top">
                          <div style="width:36px;height:36px;border-radius:10px;background:#2F6F5E26;
                                      text-align:center;line-height:36px;font-size:17px;">💬</div>
                        </td>
                        <td valign="top" style="padding-left:14px;">
                          <div style="font-size:15px;font-weight:600;color:#F3EFE6;margin-bottom:3px;">
                            Ask your AI coach
                          </div>
                          <div style="font-size:13px;color:#8A8271;line-height:1.5;">
                            Chat through your gaps and plan with an AI career coach, free to start.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}"
                       style="display:inline-block;background:#6FBFA8;color:#17140F;
                              font-size:15px;font-weight:700;text-decoration:none;
                              padding:14px 40px;border-radius:999px;">
                      Log in and get started
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 32px;text-align:center;background:#1F1C16;
                       border-top:1px solid #3A3428;">
              <p style="margin:0 0 6px;font-size:13px;color:#706A5C;">
                Questions? Reply to this email or reach us at&nbsp;
                <a href="mailto:support@resumify.app"
                   style="color:#6FBFA8;text-decoration:none;">support@resumify.app</a>
              </p>
              <p style="margin:0;font-size:12px;color:#564E42;">
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
