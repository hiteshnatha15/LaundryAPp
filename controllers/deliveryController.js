const generateOtp = require("../utils/generateOtp");
const otpService = require("../services/otpService");
const jwt = require("jsonwebtoken");
const createUpload = require("../services/uploadImageService");
const upload = createUpload("delivery");
const { deleteImageFromS3 } = require("../services/deleteImageService");
const Delivery = require("../models/deliveryModel");
const DeliverySignup = require("../models/deliverySignupModel");

exports.createDeliveryPartner = async (req, res) => {
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
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({
          message: `${key} is required`,
          success: false,
        });
      }
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

    // Generate OTP and send it to the mobile number
    const otp = generateOtp(); // Assumes a utility to generate a random OTP
    const otpExpiry = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

    // Save the OTP and delivery partner data in DeliverySignup model
    const deliverySignupData = new DeliverySignup({
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
    });

    await deliverySignupData.save();

    // Send OTP to the mobile number
    const otpSent = await otpService.sendOtp(mobile, otp); // Assumes otpService has sendOtp method
    if (!otpSent) {
      return res.status(500).json({
        message: "Failed to send OTP. Please try again.",
        success: false,
      });
    }

    // Respond with success message
    res.status(200).json({
      message:
        "OTP sent to mobile number successfully. Data saved for verification.",
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
};

exports.verifyDeliveryPartnerSignup = async (req, res) => {
  const { mobile, otp } = req.body;

  // Check if all fields are present
  if (!otp || !mobile) {
    return res.status(400).json({
      message: "OTP and mobile are required",
      success: false,
    });
  }

  try {
    // Find the delivery signup by mobile
    const deliverySignup = await DeliverySignup.findOne({ mobile });

    // If delivery signup not found
    if (!deliverySignup) {
      return res.status(404).json({
        message: "Delivery signup not found",
        success: false,
      });
    }

    // Check if OTP matches and has not expired
    if (deliverySignup.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
        success: false,
      });
    }

    if (deliverySignup.otpExpiry < Date.now()) {
      return res.status(400).json({
        message: "OTP has expired",
        success: false,
      });
    }

    // Create a new delivery partner
    const newDeliveryPartner = new Delivery({
      firstName: deliverySignup.firstName,
      lastName: deliverySignup.lastName,
      mobile: deliverySignup.mobile,
      dob: deliverySignup.dob,
      whatsappNumber: deliverySignup.whatsappNumber,
      secondaryNumber: deliverySignup.secondaryNumber,
      city: deliverySignup.city,
      completeAddress: deliverySignup.completeAddress,
      languages: deliverySignup.languages,
      referrals: deliverySignup.referrals,
    });

    await newDeliveryPartner.save();

    // Delete the delivery signup data
    await DeliverySignup.deleteOne({ mobile });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newDeliveryPartner._id, // Delivery partner's unique ID
        mobile: newDeliveryPartner.mobile,
      },
      process.env.JWT_SECRET // Use your secret key stored in the .env file
    );

    // Respond with success message and token
    res.status(200).json({
      message: "Delivery partner verified and created successfully",
      success: true,
      token, // Include the JWT token in the response
    });
  } catch (error) {
    console.error("Error verifying signup:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      success: false,
    });
  }
};

exports.updateDeliveryPartnerDocuments = [
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
        aadharNumber,
        pancardNumber,
        drivingLicenceNumber,
        rcNumber,
      } = req.body;

      const partnerId = req.partner.id // Assuming middleware sets the partnerId in the request

      if (!partnerId) {
        return res.status(400).json({
          message: "Partner ID is required and was not provided by the middleware",
          success: false,
        });
      }

      // Check if the delivery partner exists
      const existingPartner = await Delivery.findById(partnerId);
      if (!existingPartner) {
        return res.status(404).json({
          message: "Delivery partner not found",
          success: false,
        });
      }

      // Initialize update fields
      const updates = {};

      // Add document numbers to updates if provided
      if (aadharNumber) updates.aadharNumber = aadharNumber;
      if (pancardNumber) updates.pancardNumber = pancardNumber;
      if (drivingLicenceNumber) updates.drivingLicenceNumber = drivingLicenceNumber;
      if (rcNumber) updates.rcNumber = rcNumber;

      // Add document uploads to updates if provided
      const documentFields = [
        "aadharFrontPhoto",
        "aadharBackPhoto",
        "pancardFrontPhoto",
        "drivingLicenceFrontPhoto",
        "drivingLicenceBackPhoto",
        "rcFrontPhoto",
        "rcBackPhoto",
      ];

      for (const field of documentFields) {
        if (req.files[field]) {
          updates[`documentsUploaded.${field}`] = true;
          updates[`documentsUploaded.${field}Url`] = req.files[field][0].location; // Assuming S3 upload returns a `location` field
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "No new documents or document numbers provided for update",
          success: false,
        });
      }

      // Update the delivery partner's details
      const updatedPartner = await Delivery.findByIdAndUpdate(
        partnerId,
        { $set: updates },
        { new: true }
      );

      res.status(200).json({
        message: "Delivery partner details updated successfully",
        partner: updatedPartner,
        success: true,
      });
    } catch (error) {
      console.error("Error updating delivery partner details:", error);
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

exports.uploadDocuments = async (req, res) => {
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

        // Find the delivery partner by ID
        const partner = await Delivery.findById(id);

        // If the partner doesn't exist, return a 404 response
        if (!partner) {
          return res.status(404).json({
            message: "Delivery partner not found",
            success: false,
          });
        }

        // Get the uploaded files
        const {
          aadharFrontPhoto,
          aadharBackPhoto,
          pancardFrontPhoto,
          drivingLicenceFrontPhoto,
          drivingLicenceBackPhoto,
          rcFrontPhoto,
          rcBackPhoto,
        } = req.files;

        // Check if all files are present
        if (
          !aadharFrontPhoto ||
          !aadharBackPhoto ||
          !pancardFrontPhoto ||
          !drivingLicenceFrontPhoto ||
          !drivingLicenceBackPhoto ||
          !rcFrontPhoto ||
          !rcBackPhoto
        ) {
          return res.status(400).json({
            message: "All documents are required",
            success: false,
          });
        }

        // Upload the images to S3
        const aadharFrontPhotoUrl = await uploadImageToS3(aadharFrontPhoto[0]);
        const aadharBackPhotoUrl = await uploadImageToS3(aadharBackPhoto[0]);
        const pancardFrontPhotoUrl = await uploadImageToS3(
          pancardFrontPhoto[0]
        );
        const drivingLicenceFrontPhotoUrl = await uploadImageToS3(
          drivingLicenceFrontPhoto[0]
        );
        const drivingLicenceBackPhotoUrl = await uploadImageToS3(
          drivingLicenceBackPhoto[0]
        );
        const rcFrontPhotoUrl = await uploadImageToS3(rcFrontPhoto[0]);
        const rcBackPhotoUrl = await uploadImageToS3(rcBackPhoto[0]);

        // Update the delivery partner with the image URLs
        partner.documentsUploaded = {
          aadharFrontPhoto: true,
          aadharFrontPhotoUrl,
          aadharBackPhoto: true,
          aadharBackPhotoUrl,
          pancardFrontPhoto: true,
          pancardFrontPhotoUrl,
          drivingLicenceFrontPhoto: true,
          drivingLicenceFrontPhotoUrl,
          drivingLicenceBackPhoto: true,
          drivingLicenceBackPhotoUrl,
          rcFrontPhoto: true,
          rcFrontPhotoUrl,
          rcBackPhoto: true,
          rcBackPhotoUrl,
        };
      } catch (error) {
        console.error("Error uploading documents:", error);
        res.status(500).json({
          message: "Server error",
          error: error.message,
          success: false,
        });
      }
    };
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
      "firstName lastName mobile d ob whatsappNumber secondaryNumber city completeAddress languages referrals aadharNumber pancardNumber drivingLicenceNumber rcNumber aadharFrontPhoto aadharBackPhoto pancardFrontPhoto drivingLicenceFrontPhoto drivingLicenceBackPhoto rcFrontPhoto rcBackPhoto bankDetails emergencyContactNumber"
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
