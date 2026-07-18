const nodemailer = require('nodemailer')
const dns = require('dns')

// Render's free tier blocks outbound SMTP ports (25/465/587) since Sept 2025 sir —
// so in production we send over Brevo's HTTPS API (port 443, never blocked) and only
// fall back to direct Gmail SMTP when no BREVO_API_KEY is set (local dev)
const sendViaBrevo = async (email, title, body) => {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sender: { name: 'Resume Enhancer', email: process.env.MAIL_USER },
            to: [{ email }],
            subject: title,
            htmlContent: body,
        }),
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Brevo API error ${response.status}: ${errText}`)
    }

    return response.json()
}

const sendViaSmtp = async (email, title, body) => {
    // Render has no outbound IPv6 route sir — the `family: 4` transport option doesn't
    // reliably stop Nodemailer's socket layer from picking an IPv6 result, so resolve to
    // an IPv4 address ourselves and connect to that directly instead
    const { address: ipv4Host } = await dns.promises.lookup(process.env.MAIL_HOST, { family: 4 })

    const transporter = nodemailer.createTransport({
        host: ipv4Host,
        port: 465,
        secure: true,
        tls: {
            servername: process.env.MAIL_HOST, // keep TLS cert validation matching the real hostname
        },
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
        // without these, a network-level failure to reach MAIL_HOST (blocked port,
        // wrong host, dead SMTP server) hangs the request forever instead of erroring sir
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    })

    return transporter.sendMail({
        from: `"Resume Enhancer" <${process.env.MAIL_USER}>`,
        to: email,
        subject: title,
        html: body,
    })
}

// sends one email sir — used by OTP, password reset, and account deletion notices
const mailSender = async (email, title, body) => {
    try {
        if (process.env.BREVO_API_KEY) {
            return await sendViaBrevo(email, title, body)
        }

        // no SMTP configured sir — skip sending instead of crashing the caller
        if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
            console.log(`Mail not configured — would have sent "${title}" to ${email}`)
            return null
        }

        return await sendViaSmtp(email, title, body)
    } catch (error) {
        console.log('mailSender error:', error.message)
        throw error
    }
}

module.exports = mailSender
