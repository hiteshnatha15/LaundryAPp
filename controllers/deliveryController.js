const generateOtp = require("../utils/generateOtp");
const otpService = require("../services/otpService");
const jwt = require("jsonwebtoken");
const createUpload = require("../services/uploadImageService");
const upload = createUpload("delivery");
const { deleteImageFromS3 } = require("../services/deleteImageService");
const Delivery = require("../models/deliveryModel");

// Middleware to handle multiple image uploads
exports.createDeliveryPartner = [
  upload.fields([
    { name: "aadharFrontPhoto", maxCount: 1 },
    { name: "aadharBackPhoto", maxCount: 1 },
    { name: "pancardFrontPhoto", maxCount: 1 },
    { name: "drivingLicenceFrontPhoto", maxCount: 1 },
    { name: "drivingLicenceBackPhoto", maxCount: 1 },
    { name: "rcFrontPhoto", maxCount: 1 },
    { name: "rcBackPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        mobile,
        dob,
        whatsappNumber,
        secondaryNumber,
        city,
        completeAddress,
        languages,
        referrals,
        otp,
        otpExpiry,
        aadharNumber,
        pancardNumber,
        drivingLicenceNumber,
        rcNumber,
        bankDetails,
        emergencyContactNumber,
      } = req.body;

      // Validate required fields
      const requiredFields = {
        firstName,
        lastName,
        mobile,
        dob,
        whatsappNumber,
        city,
        completeAddress,
        languages,
        aadharNumber,
        pancardNumber,
        drivingLicenceNumber,
        rcNumber,
        bankDetails,
        emergencyContactNumber,
      };

      for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
          return res.status(400).json({
            message: `${key} is required`,
            success: false,
          });
        }
      }

      // Check if all required images are uploaded
      if (
        !req.files["aadharFrontPhoto"] ||
        !req.files["aadharBackPhoto"] ||
        !req.files["pancardFrontPhoto"] ||
        !req.files["drivingLicenceFrontPhoto"] ||
        !req.files["drivingLicenceBackPhoto"] ||
        !req.files["rcFrontPhoto"] ||
        !req.files["rcBackPhoto"]
      ) {
        return res.status(400).json({
          message:
            "All required photo fields (Aadhar, PAN, Driving License, RC) must be provided",
          success: false,
        });
      }

      // Check if the delivery partner already exists
      const existingPartner = await Delivery.findOne({
        $or: [{ mobile }, { whatsappNumber }, { secondaryNumber }],
      });
      if (existingPartner) {
        return res.status(400).json({
          message:
            "Delivery partner already exists with this mobile or WhatsApp number",
          success: false,
        });
      }

      // Get URLs from S3 for each required image
      const aadharFrontPhoto = req.files["aadharFrontPhoto"][0].location;
      const aadharBackPhoto = req.files["aadharBackPhoto"][0].location;
      const pancardFrontPhoto = req.files["pancardFrontPhoto"][0].location;
      const drivingLicenceFrontPhoto =
        req.files["drivingLicenceFrontPhoto"][0].location;
      const drivingLicenceBackPhoto =
        req.files["drivingLicenceBackPhoto"][0].location;
      const rcFrontPhoto = req.files["rcFrontPhoto"][0].location;
      const rcBackPhoto = req.files["rcBackPhoto"][0].location;

      // Create a new delivery partner
      const newPartner = new Delivery({
        firstName,
        lastName,
        mobile,
        dob,
        whatsappNumber,
        secondaryNumber,
        city,
        completeAddress,
        languages,
        referrals,
        otp,
        otpExpiry,
        aadharNumber,
        aadharFrontPhoto,
        aadharBackPhoto,
        pancardNumber,
        pancardFrontPhoto,
        drivingLicenceNumber,
        drivingLicenceFrontPhoto,
        drivingLicenceBackPhoto,
        rcNumber,
        rcFrontPhoto,
        rcBackPhoto,
        bankDetails,
        emergencyContactNumber,
      });

      // Save the new delivery partner to the database
      await newPartner.save();

      res.status(201).json({
        message: "Delivery partner created successfully",
        partner: newPartner,
        success: true,
      });
    } catch (error) {
      console.error("Error creating delivery partner:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        success: false,
      });
    }
  },
];

// Middleware to handle updating delivery partner details
exports.updateDeliveryPartner = [
  upload.fields([
    { name: "aadharFrontPhoto", maxCount: 1 },
    { name: "aadharBackPhoto", maxCount: 1 },
    { name: "pancardFrontPhoto", maxCount: 1 },
    { name: "drivingLicenceFrontPhoto", maxCount: 1 },
    { name: "drivingLicenceBackPhoto", maxCount: 1 },
    { name: "rcFrontPhoto", maxCount: 1 },
    { name: "rcBackPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const id = req.delivery.id;
      const {
        firstName,
        lastName,
        mobile,
        dob,
        whatsappNumber,
        secondaryNumber,
        city,
        completeAddress,
        languages,
        referrals,
        otp,
        otpExpiry,
        aadharNumber,
        pancardNumber,
        drivingLicenceNumber,
        rcNumber,
        bankDetails,
        emergencyContactNumber,
      } = req.body;
      // Find the delivery partner by ID
      const existingPartner = await Delivery.findById(id);
      if (!existingPartner) {
        return res.status(404).json({
          message: "Delivery partner not found",
          success: false,
        });
      }

      // Update fields if provided
      const updateFields = {
        firstName,
        lastName,
        mobile,
        dob,
        whatsappNumber,
        secondaryNumber,
        city,
        completeAddress,
        languages,
        referrals,
        otp,
        otpExpiry,
        aadharNumber,
        pancardNumber,
        drivingLicenceNumber,
        rcNumber,
        bankDetails,
        emergencyContactNumber,
      };

      // Remove undefined fields from updateFields
      for (const key in updateFields) {
        if (updateFields[key] === undefined) {
          delete updateFields[key];
        }
      }

      // Handle image updates
      const photoFields = [
        "aadharFrontPhoto",
        "aadharBackPhoto",
        "pancardFrontPhoto",
        "drivingLicenceFrontPhoto",
        "drivingLicenceBackPhoto",
        "rcFrontPhoto",
        "rcBackPhoto",
      ];

      for (const field of photoFields) {
        if (req.files[field]) {
          // Delete the existing image from S3 if a new one is uploaded
          if (existingPartner[field]) {
            await deleteImageFromS3(existingPartner[field]);
          }
          // Update with new image URL
          updateFields[field] = req.files[field][0].location;
        }
      }

      // Update the delivery partner with new data
      await Delivery.findByIdAndUpdate(id, updateFields, { new: true });

      res.status(200).json({
        message: "Delivery partner updated successfully",
        success: true,
      });
    } catch (error) {
      console.error("Error updating delivery partner:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        success: false,
      });
    }
  },
];

exports.loginDeliveryPartner = async (req, res) => {
  const { mobile } = req.body;

  // Check if mobile number is present
  if (!mobile) {
    return res
      .status(400)
      .json({ message: "Mobile number is required", success: false });
  }

  try {
    // Find the delivery by mobile
    const delivery = await Delivery.findOne({ mobile });

    // If delivery not found
    if (!delivery) {
      return res
        .status(404)
        .json({ message: "Delivery not found", success: false });
    }

    // Generate OTP
    const otp = generateOtp();

    // Send OTP to mobile
    const otpSent = await otpService.sendOtp(mobile, otp);

    // Handle OTP sending failure
    if (!otpSent) {
      return res
        .status(500)
        .json({ message: "Failed to send OTP", success: false });
    }

    // Save OTP and its expiry to the delivery
    delivery.otp = otp;
    delivery.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expiration time (10 minutes)
    await delivery.save();

    // Return success response
    res.status(200).json({
      message: "OTP sent successfully",
      delivery: {
        firstName: delivery.firstName,
        lastName: delivery.lastName,
        mobile: delivery.mobile,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error logging in delivery:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.verifyDeliveryLogin = async (req, res) => {
  const { mobile, otp } = req.body;

  // Check if all fields are present
  if (!otp || !mobile) {
    return res.status(400).json({
      message: "OTP and mobile are required",
      success: false,
    });
  }

  try {
    // Find the delivery partner by mobile
    const delivery = await Delivery.findOne({ mobile });

    // If delivery partner not found
    if (!delivery) {
      return res
        .status(404)
        .json({ message: "Delivery partner not found", success: false });
    }

    // Check if OTP matches and has not expired
    if (delivery.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (delivery.otpExpiry < Date.now()) {
      return res
        .status(400)
        .json({ message: "OTP has expired", success: false });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: delivery._id, // Delivery partner's unique ID
        mobile: delivery.mobile,
      },
      process.env.JWT_SECRET // Use your secret key stored in the .env file
    );

    // Return success response with the token
    res.status(200).json({
      message: "Delivery partner successfully verified and logged in",
      delivery: {
        firstName: delivery.firstName,
        lastName: delivery.lastName,
        mobile: delivery.mobile,
      },
      success: true,
      token, // Include the JWT token in the response
    });
  } catch (error) {
    console.error("Error verifying login:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.getDeliveryPartner = async (req, res) => {
  try {
    const id = req.delivery.id;

    // Find the delivery partner by ID and select only necessary fields
    const partner = await Delivery.findById(id).select(
      "firstName lastName mobile dob whatsappNumber secondaryNumber city completeAddress languages referrals aadharNumber pancardNumber drivingLicenceNumber rcNumber aadharFrontPhoto aadharBackPhoto pancardFrontPhoto drivingLicenceFrontPhoto drivingLicenceBackPhoto rcFrontPhoto rcBackPhoto bankDetails emergencyContactNumber"
    );

    // If the partner doesn't exist, return a 404 response
    if (!partner) {
      return res.status(404).json({
        message: "Delivery partner not found",
        success: false,
      });
    }

    // Return the partner details
    res.status(200).json({
      message: "Delivery partner retrieved successfully",
      partner,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching delivery partner:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      success: false,
    });
  }
};
