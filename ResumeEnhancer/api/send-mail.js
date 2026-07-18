import nodemailer from 'nodemailer'

// mail relay sir — Render's free tier blocks outbound SMTP ports (25/465/587), but Vercel
// only blocks port 25. So the backend POSTs the email here over HTTPS and THIS function does
// the real Nodemailer+Gmail send from Vercel's network. Guarded by a shared secret that must
// match MAIL_RELAY_SECRET on both the Render backend and this Vercel project.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  // never run open sir — if the secret isn't configured, refuse everything
  if (!process.env.MAIL_RELAY_SECRET || req.headers['x-relay-secret'] !== process.env.MAIL_RELAY_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }

  const { to, subject, html } = req.body || {}
  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, message: 'to, subject and html are required' })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      // stay well under the serverless max duration sir — a hung SMTP socket must error, not time the function out
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    })

    // MUST await before responding sir — serverless freezes background work once the response is sent
    const info = await transporter.sendMail({
      from: `"Resume Enhancer" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    })

    return res.status(200).json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.log('relay mail error:', error.message)
    return res.status(502).json({ success: false, message: 'Failed to send email' })
  }
}
