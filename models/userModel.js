const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  mobile: { type: String, unique: true },
  otp: String,
  otpExpiry: Date,
  profileImage: String,
});

module.exports = mongoose.model("User", UserSchema);
