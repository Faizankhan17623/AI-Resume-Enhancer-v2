const nodemailer = require('nodemailer')
const dns = require('dns')

// Render's free tier blocks outbound SMTP ports (25/465/587) sir — so in production the
// email hops to our own Vercel serverless function (/api/send-mail) over HTTPS, and THAT
// runs the real Nodemailer+Gmail send from Vercel's network where port 465 is open.
// Same Gmail, same app password, no third-party mail service.
const sendViaRelay = async (email, title, body) => {
    const response = await fetch(process.env.MAIL_RELAY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-relay-secret': process.env.MAIL_RELAY_SECRET,
        },
        body: JSON.stringify({ to: email, subject: title, html: body }),
        // a dead relay must error fast, not hang the caller's request sir
        signal: AbortSignal.timeout(20000),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.success) {
        throw new Error(`mail relay error ${response.status}: ${data.message || 'unknown'}`)
    }
    return data
}

// sends one email sir — used by OTP, password reset, and account deletion notices
const mailSender = async (email, title, body) => {
    try {
        // production path sir — relay through Vercel where SMTP isn't blocked
        if (process.env.MAIL_RELAY_URL && process.env.MAIL_RELAY_SECRET) {
            return await sendViaRelay(email, title, body)
        }

        // no SMTP configured sir — skip sending instead of crashing the caller
        if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
            console.log(`Mail not configured — would have sent "${title}" to ${email}`)
            return null
        }

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

        const info = await transporter.sendMail({
            from: `"Resume Enhancer" <${process.env.MAIL_USER}>`,
            to: email,
            subject: title,
            html: body,
        })

        return info
    } catch (error) {
        console.log('mailSender error:', error.message)
        throw error
    }
}

module.exports = mailSender