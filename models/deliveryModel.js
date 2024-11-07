const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  whatsappNumber: {
    type: String,
    required: true,
    unique: true,
  },
  secondaryNumber: {
    type: String,
    required: false,
    unique: true,
  },
  city: {
    type: String,
    required: true,
  },
  completeAddress: {
    type: String,
    required: true,
  },
  languages: {
    type: [String],
    required: true,
  },
  referrals: {
    type: String,
    required: false,
  },
  otp: {
    type: String,
    required: false,
  },
  otpExpiry: {
    type: Date,
    required: false,
  },
  aadharNumber: {
    type: String,
    required: true,
  },
  aadharFrontPhoto: {
    type: String,
    required: true,
  },
  aadharBackPhoto: {
    type: String,
    required: true,
  },
  pancardNumber: {
    type: String,
    required: true,
  },
  pancardFrontPhoto: {
    type: String,
    required: true,
  },
  drivingLicenceNumber: {
    type: String,
    required: true,
  },
  drivingLicenceFrontPhoto: {
    type: String,
    required: true,
  },
  drivingLicenceBackPhoto: {
    type: String,
    required: true,
  },
  rcNumber: {
    type: String,
    required: true,
  },
  rcFrontPhoto: {
    type: String,
    required: true,
  },
  rcBackPhoto: {
    type: String,
    required: true,
  },
  bankDetails: {
    accountNumber: {
      type: String,
      required: true,
    },
    ifscCode: {
      type: String,
      required: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
  },
  emergencyContactNumber: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Delivery", deliverySchema);
