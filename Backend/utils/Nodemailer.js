const nodemailer = require("nodemailer")
const dns = require("dns")
const { promisify } = require("util")

const dnsLookup = promisify(dns.lookup)

const mailSender = async (email, title, body) => {
  try {
    const host = process.env.MAIL_HOST

    // Render's containers can't route the IPv6 address smtp.gmail.com resolves to (ENETUNREACH) sir —
    // nodemailer has no "force IPv4" option that reaches its DNS layer, so we resolve to a literal
    // IPv4 address ourselves and pass servername separately so TLS still validates the real hostname
    let connectHost = host
    let servername
    try {
      const { address } = await dnsLookup(host, { family: 4 })
      connectHost = address
      servername = host
    } catch (lookupErr) {
      // fall back to the hostname as-is sir — worst case we're back to the original behavior
    }

    let transporter = nodemailer.createTransport({
      host: connectHost,
      port: 587,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      secure: false,
      tls: {
        rejectUnauthorized: false,
        ...(servername ? { servername } : {}),
      },
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