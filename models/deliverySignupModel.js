const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true, // Ensures no duplicate mobile numbers
      match: /^[0-9]{10}$/, // Validates 10-digit numbers
    },
    dob: {
      type: Date,
      required: true,
    },
    whatsappNumber: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/, // Validates 10-digit numbers
    },
    secondaryNumber: {
      type: String,
      match: /^[0-9]{10}$/, // Optional field; validates 10-digit numbers
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    completeAddress: {
      type: String,
      required: true,
      trim: true,
    },
    languages: {
      type: [String], // Array of strings
      required: true,
    },
    referrals: {
      type: String, // Optional field
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpiry: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

const Delivery = mongoose.model("DeliverySignup", deliverySchema);

module.exports = Delivery;
