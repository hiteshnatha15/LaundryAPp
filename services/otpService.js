const axios = require("axios");
require("dotenv").config();

const otpService = {
  sendOtp: async (mobile, otp) => {
    const apiKey = process.env.TEXTLOCAL_API_KEY;
    const sender = "SSCURA"; // Textlocal sender ID
    const message = `Dear Customer Your OTP to verify your SCURA account is ${otp}. Team Scura Network`;

    const url = `https://api.textlocal.in/send/?apiKey=${apiKey}&numbers=${mobile}&sender=${sender}&message=${encodeURIComponent(
      message
    )}`;

    try {
      const response = await axios.get(url);
      if (response.data.status === "success") {
        return true;
      } else {
        console.error("Error sending OTP:", response.data);
        return false;
      }
    } catch (error) {
      console.error("Error:", error);
      return false;
    }
  },
};

module.exports = otpService;
