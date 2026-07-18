const nodemailer = require("nodemailer")
const dns = require("dns")
const { promisify } = require("util")

const dnsLookup = promisify(dns.lookup)

// races a promise against a timeout sir — dns.lookup has no built-in timeout option,
// and a hung lookup here would otherwise block the whole request forever with no error
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
  ])

const mailSender = async (email, title, body) => {
  try {
    const host = process.env.MAIL_HOST

    // Render's containers can't route the IPv6 address smtp.gmail.com resolves to (ENETUNREACH) sir —
    // nodemailer has no "force IPv4" option that reaches its DNS layer, so we resolve to a literal
    // IPv4 address ourselves and pass servername separately so TLS still validates the real hostname
    let connectHost = host
    let servername
    try {
      const { address } = await withTimeout(dnsLookup(host, { family: 4 }), 5000)
      connectHost = address
      servername = host
    } catch (lookupErr) {
      console.log(`[mailSender] IPv4 lookup for "${host}" failed/timed out: ${lookupErr.message} — falling back to hostname as-is`)
      // fall back to the hostname as-is sir — worst case we're back to the original behavior
    }

    // 465 (implicit TLS) instead of 587 (STARTTLS) sir — Render's free tier appears to block
    // outbound 587 entirely (connection timeout regardless of IPv4/IPv6), 465 is the standard fallback
    let transporter = nodemailer.createTransport({
      host: connectHost,
      port: 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      secure: true,
      tls: {
        rejectUnauthorized: false,
        ...(servername ? { servername } : {}),
      },
      // bounded timeouts sir — a stalled/blackholed connection should fail fast, not hang the request forever
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })

    let info = await transporter.sendMail({
      from: `"Resume Enhancer" <${process.env.MAIL_USER}>`,
      to: `${email}`, // list of receivers
      subject: `${title}`, // Subject line
      html: `${body}`, // html body
    })
    // console.log(info.response)
    return info
  } catch (error) {
    // console.log(error.message)
    throw error
  }
}

module.exports = mailSender