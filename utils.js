const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const reportUtils = require('./report_utils');
dotenv.config();

class Utils {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        type: 'login',
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendEmail(from, to, subject, text, html) {
    const mailOptions = {
      from: process.env.EMAIL_USER || from,
      to: process.env.EMAIL_TO || to,
      subject: subject,
      text: text,
      html: html
    };
    try {
      await this.transporter.verify();
      console.log("Server is ready to take our messages");
      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent: " + info.response);
    } catch (error) {
      console.error("Error sending email: ", error);
    }
  }
}

const utils = new Utils();

// Attach all reportUtils functions to the utils instance
Object.assign(utils, reportUtils);

module.exports = { utils };
