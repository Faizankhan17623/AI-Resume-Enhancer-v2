const nodemailer = require("nodemailer")

const mailSender = async (email, title, body) => {
  try {
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 587,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      secure: false,
      tls: {
        rejectUnauthorized: false,
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