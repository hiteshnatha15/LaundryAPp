const mongoose = require("mongoose");

const userSignupModel = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobileOtp: {
    type: String,
    required: true,
  },
  emailOtp: {
    type: String,
    required: true,
  },
  mobileOtpExpiry: {
    type: String,
    required: true,
  },
  emailOtpExpiry: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("UserSignup", userSignupModel);
