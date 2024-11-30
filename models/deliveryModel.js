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
    required: false,
  },
  pancardNumber: {
    type: String,
    required: false,
  },
  drivingLicenceNumber: {
    type: String,
    required: false,
  },
  rcNumber: {
    type: String,
    required: false,
  },
  bankDetails: {
    accountNumber: {
      type: String,
      required: false,
    },
    ifscCode: {
      type: String,
      required: false,
    },
    accountHolderName: {
      type: String,
      required: false,
    },
  },
  emergencyContactNumber: {
    type: String,
    required: false,
  },
  documentsUploaded: {
    aadharFrontPhoto: { type: Boolean, default: false },
    aadharFrontPhotoUrl: { type: String, required: false },
    aadharBackPhoto: { type: Boolean, default: false },
    aadharBackPhotoUrl: { type: String, required: false },
    pancardFrontPhoto: { type: Boolean, default: false },
    pancardFrontPhotoUrl: { type: String, required: false },
    drivingLicenceFrontPhoto: { type: Boolean, default: false },
    drivingLicenceFrontPhotoUrl: { type: String, required: false },
    drivingLicenceBackPhoto: { type: Boolean, default: false },
    drivingLicenceBackPhotoUrl: { type: String, required: false },
    rcFrontPhoto: { type: Boolean, default: false },
    rcFrontPhotoUrl: { type: String, required: false },
    rcBackPhoto: { type: Boolean, default: false },
    rcBackPhotoUrl: { type: String, required: false },
  },
});

module.exports = mongoose.model("Delivery", deliverySchema);
