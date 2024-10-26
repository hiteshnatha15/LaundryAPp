const nodemailer = require("nodemailer");
require("dotenv").config();

const mailOtpService = async (email, otp) => {
  try {
    // Create the transporter
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 587,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Create the title and body dynamically for the OTP email
    const title = "Laundry App - OTP Verification";
    const body = `
      <h1>Welcome to Laundry App!</h1>
      <p>Your One-Time Password (OTP) for verification is: <b>${otp}</b></p>
      <br />
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you,<br>The Laundry App Team</p>
    `;

    // Send the email
    let info = await transporter.sendMail({
      from: `"Laundry App" <${process.env.MAIL_USER}>`, // Sender info
      to: email, // Recipient email
      subject: title, // Email subject
      html: body, // Email content (HTML)
    });
    return info;
  } catch (error) {
    console.log("Error sending email:", error.message);
    return error;
  }
};

module.exports = mailOtpService;
