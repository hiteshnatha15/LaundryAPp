const PartnerSignup = require("../models/partnerSignupModel");
const Partner = require("../models/partnerModel");
const generateOtp = require("../utils/generateOtp");
const otpService = require("../services/otpService");
const mailOtpService = require("../services/mailOtpService");
const jwt = require("jsonwebtoken");
const createUpload = require("../services/uploadImageService");
const { deleteImageFromS3 } = require("../services/deleteImageService");
const Coupon = require("../models/couponModel");

exports.createPartner = async (req, res) => {
  const { name, email, mobile } = req.body;

  // Check if all fields are present
  if (!name || !email || !mobile) {
    return res
      .status(400)
      .json({ message: "All fields are required", success: false });
  }

  try {
    // Check if the user already exists by email or mobile
    const existingPartner = await Partner.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingPartner) {
      return res.status(400).json({
        message: "Partner already exists with this email or mobile",
        success: false,
      });
    }

    // Generate OTPs for mobile and email separately
    const mobileOtp = generateOtp();
    const emailOtp = generateOtp();

    // Create the user with the generated OTPs
    // User data to update or create
    const partnerData = {
      name,
      email,
      mobile,
      mobileOtp, // Save generated OTP for mobile
      emailOtp, // Save generated OTP for email
      mobileOtpExpiry: new Date(Date.now() + 10 * 60 * 1000), // Mobile OTP expiration time (10 minutes)
      emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000), // Email OTP expiration time (10 minutes)
    };

    // Find the user by email or mobile and update if exists, else create new (upsert: true)
    const partner = await PartnerSignup.findOneAndUpdate(
      { $or: [{ email }, { mobile }] }, // Find by email or mobile
      { $set: partnerData }, // Update user data
      { new: true, upsert: true } // Create if not found (upsert), return the new or updated document
    );

    // Save the user to the database
    await partner.save();

    // Send OTP to mobile
    const otpSent = await otpService.sendOtp(mobile, mobileOtp);
    // Send OTP to email
    const otpEmailSent = await mailOtpService(email, emailOtp);

    // Handle OTP sending failure
    if (!otpSent) {
      return res
        .status(500)
        .json({ message: "Failed to send OTP to mobile", success: false });
    }
    if (!otpEmailSent) {
      return res
        .status(500)
        .json({ message: "Failed to send OTP to email", success: false });
    }

    // If everything is successful, return success response
    res.status(201).json({
      message: "Partner created successfully, OTP sent to mobile and email",
      partner: {
        name,
        email,
        mobile,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error creating partner:", error);
    // Handle server error
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.verifyPartnerSignup = async (req, res) => {
  const { email, mobile, mobileOtp, emailOtp } = req.body;

  // Check if all fields are present
  if (!email || !mobile || !mobileOtp || !emailOtp) {
    return res
      .status(400)
      .json({ message: "All fields are required", success: false });
  }

  try {
    // Find the user by email or mobile
    const partner = await PartnerSignup.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Check if mobile OTP matches and has not expired
    if (partner.mobileOtp !== mobileOtp) {
      return res
        .status(400)
        .json({ message: "Invalid mobile OTP", success: false });
    }

    if (partner.mobileOtpExpiry < Date.now()) {
      return res
        .status(400)
        .json({ message: "Mobile OTP has expired", success: false });
    }

    // Check if email OTP matches and has not expired
    if (partner.emailOtp !== emailOtp) {
      return res
        .status(400)
        .json({ message: "Invalid email OTP", success: false });
    }

    if (partner.emailOtpExpiry < Date.now()) {
      return res
        .status(400)
        .json({ message: "Email OTP has expired", success: false });
    }

    await partner.save();

    // Create a new entry in the User model after verification
    const newPartner = new Partner({
      name: partner.name,
      email: partner.email,
      mobile: partner.mobile,
    });

    // Save the new user entry in the User model
    await newPartner.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newPartner._id, // User's unique ID
        mobile: newPartner.mobile,
        email: newPartner.email,
      },
      process.env.JWT_SECRET // Use your secret key stored in the .env file
    );

    // Return success response with the token
    res.status(200).json({
      message: "Partner successfully verified and added to the system",
      partner: {
        name: partner.name,
        email: partner.email,
        mobile: partner.mobile,
      },
      success: true,
      token, // Include the JWT token in the response
    });
  } catch (error) {
    console.error("Error verifying partner:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.loginPartner = async (req, res) => {
  const { email, mobile } = req.body;

  // Check if all fields are present
  if (!email && !mobile) {
    return res
      .status(400)
      .json({ message: "Email or mobile is required", success: false });
  }

  try {
    // Find the user by email or mobile
    const partner = await Partner.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Generate OTP
    const otp = generateOtp();

    // Send OTP to email or mobile based on the provided field
    let otpSent;
    if (email) {
      otpSent = await mailOtpService(email, otp);
    } else if (mobile) {
      otpSent = await otpService.sendOtp(mobile, otp);
    }

    // Handle OTP sending failure
    if (!otpSent) {
      return res
        .status(500)
        .json({ message: "Failed to send OTP", success: false });
    }

    // Save OTP and its expiry to the user
    partner.otp = otp;
    partner.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expiration time (10 minutes)
    await partner.save();

    // Return success response
    res.status(200).json({
      message: "OTP sent successfully",
      partner: {
        name: partner.name,
        email: partner.email,
        mobile: partner.mobile,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error logging in partner:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.verifyPartnerLogin = async (req, res) => {
  const { email, mobile, otp } = req.body;

  // Check if all fields are present
  if (!otp || (!email && !mobile)) {
    return res.status(400).json({
      message: "OTP and either email or mobile are required",
      success: false,
    });
  }

  try {
    // Find the user by email or mobile
    const partner = await Partner.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Check if OTP matches and has not expired
    if (partner.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (partner.otpExpiry < Date.now()) {
      return res
        .status(400)
        .json({ message: "OTP has expired", success: false });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: partner._id, // User's unique ID
        mobile: partner.mobile,
        email: partner.email,
      },
      process.env.JWT_SECRET // Use your secret key stored in the .env file
    );

    // Return success response with the token
    res.status(200).json({
      message: "Partner successfully verified and logged in",
      partner: {
        name: partner.name,
        email: partner.email,
        mobile: partner.mobile,
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

exports.getPartnerProfile = async (req, res) => {
  try {
    // Find the user by ID
    const partner = await Partner.findById(req.partner.id);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    return res.status(200).json({
      message: "Partner profile fetched successfully",
      partner: {
        name: partner.name,
        email: partner.email,
        mobile: partner.mobile,
        paymentDetails: partner.paymentDetails,
        laundryName: partner.laundryName,
        expressServices: partner.expressServices,
        deliveryServices: partner.deliveryServices,
        hours: partner.hours,
        location: partner.location,
        logo: partner.logo,
        images: partner.images,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching partner profile:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.updatePartnerProfile = async (req, res) => {
  const { name, email, mobile } = req.body;

  // Check if at least one field is present
  if (!name && !email && !mobile) {
    return res
      .status(400)
      .json({ message: "At least one field is required", success: false });
  }

  try {
    // Find the user by ID
    const partner = await Partner.findById(req.partner.id);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Update user data only if provided
    if (name) partner.name = name;
    if (email) partner.email = email;
    if (mobile) partner.mobile = mobile;

    // Save the updated user
    await partner.save();

    return res.status(200).json({
      message: "Partner profile updated successfully",
      partner: {
        name: partner.name,
        email: partner.email,
        mobile: partner.mobile,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error updating partner profile:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};
// Add a new category
exports.addCategory = async (req, res) => {
  const { category } = req.body; // Category should include name and subcategories
  const partnerId = req.partner.id; // Middleware sets req.partnerId

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Check for duplicate category name
    const duplicateCategory = partner.categories.find(
      (cat) => cat.name === category.name
    );
    if (duplicateCategory) {
      return res.status(400).json({
        message: "Category with this name already exists",
        success: false,
      });
    }

    partner.categories.push(category); // Add new category to the partner's categories array
    await partner.save();
    res.status(201).json({ categories: partner.categories, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message, success: false });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  const partnerId = req.partner.id; // Middleware sets req.partnerId

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }
    res.status(200).json({ categories: partner.categories, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message, success: false });
  }
};

exports.updateCategory = async (req, res) => {
  const { categoryId } = req.params; // Category ID from params
  const partnerId = req.partner.id; // Middleware sets req.partnerId

  // Ensure category exists in the request body
  const { category: newCategoryData } = req.body;

  if (!newCategoryData) {
    return res
      .status(400)
      .json({ message: "Category data is required", success: false });
  }

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Find the index of the category
    const categoryIndex = partner.categories.findIndex(
      (cat) => cat._id.toString() === categoryId
    );
    if (categoryIndex === -1) {
      return res
        .status(404)
        .json({ message: "Category not found", success: false });
    }

    // Update the category data
    partner.categories[categoryIndex] = {
      ...partner.categories[categoryIndex]._doc, // Keep the existing category structure
      ...newCategoryData, // Merge with new category data
    };

    // Save the updated partner document
    await partner.save();

    // Return the updated category
    res
      .status(200)
      .json({ category: partner.categories[categoryIndex], success: true });
  } catch (error) {
    console.error("Error updating category: ", error.message);
    res.status(500).json({ error: error.message, success: false });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  const { categoryId } = req.params; // Category ID from params
  const partnerId = req.partner.id; // Middleware sets req.partnerId

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Remove category by categoryId
    partner.categories = partner.categories.filter(
      (cat) => cat._id.toString() !== categoryId
    );
    await partner.save();
    res.status(200).json({ categories: partner.categories, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message, success: false });
  }
};

// Add or update bank details for a partner
exports.addOrUpdatePartnerBankDetails = async (req, res) => {
  try {
    const { accountHolderName, accountNumber, ifscCode, phonePe, Upi } =
      req.body;
    const partnerId = req.partner.id; // Middleware sets req.partnerId

    // Check if at least one type of payment detail is provided
    const isBankDetailsProvided =
      accountHolderName && accountNumber && ifscCode;
    const isUpiProvided = !!Upi;
    const isPhonePeProvided = !!phonePe;

    // Ensure at least one type of payment method is provided
    if (!isBankDetailsProvided && !isUpiProvided && !isPhonePeProvided) {
      return res.status(400).json({
        message: "Please provide either bank account details, UPI, or PhonePe",
        success: false,
      });
    }

    // If bank details are provided, ensure all fields are present and validate format
    if (isBankDetailsProvided) {
      if (!accountHolderName || !accountNumber || !ifscCode) {
        return res.status(400).json({
          message:
            "Please provide complete bank account details: account holder name, account number, and IFSC code",
          success: false,
        });
      }

      // Validate the account number (e.g., must be numeric and within a reasonable range of digits)
      const accountNumberRegex = /^[0-9]{9,18}$/;
      if (!accountNumberRegex.test(accountNumber)) {
        return res.status(400).json({
          message:
            "Invalid account number. It should be between 9 and 18 digits long.",
          success: false,
        });
      }

      // Validate the IFSC code format (e.g., 4 letters followed by 7 digits)
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(ifscCode)) {
        return res.status(400).json({
          message:
            "Invalid IFSC code. It should follow the format: 4 letters followed by 0 and 6 alphanumeric characters.",
          success: false,
        });
      }
    }

    // If UPI is provided, validate format (e.g., must include '@')
    if (isUpiProvided) {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(Upi)) {
        return res.status(400).json({
          message:
            "Invalid UPI ID. Please provide a valid UPI ID in the format: yourname@bank.",
          success: false,
        });
      }
    }

    // If PhonePe is provided, validate it is a valid phone number format
    if (isPhonePeProvided) {
      const phonePeRegex = /^[6-9]\d{9}$/; // Assuming Indian phone numbers
      if (!phonePeRegex.test(phonePe)) {
        return res.status(400).json({
          message:
            "Invalid PhonePe number. Please provide a valid 10-digit mobile number.",
          success: false,
        });
      }
    }

    // Find the partner by ID
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Update the payment details based on the provided information
    partner.paymentDetails = {
      accountHolderName: isBankDetailsProvided ? accountHolderName : undefined,
      accountNumber: isBankDetailsProvided ? accountNumber : undefined,
      ifscCode: isBankDetailsProvided ? ifscCode : undefined,
      phonePe: isPhonePeProvided ? phonePe : undefined,
      Upi: isUpiProvided ? Upi : undefined,
    };

    // Save the updated partner details
    await partner.save();
    res.status(200).json({
      message: "Bank details added/updated successfully",
      success: true,
      paymentDetails: partner.paymentDetails,
    });
  } catch (error) {
    console.error("Error adding bank details:", error);

    // Handle mongoose validation errors specifically
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        error: error.errors,
        success: false,
      });
    }

    // Handle database connection issues
    if (error.name === "MongoNetworkError") {
      return res.status(503).json({
        message: "Database connection error. Please try again later.",
        success: false,
      });
    }

    // General error response
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.addServicesAndLocation = async (req, res) => {
  const {
    laundryName,
    expressService,
    deliveryService,
    operationHours,
    location,
  } = req.body;
  const partnerId = req.partner.id;

  // Check if all fields are present
  if (
    !laundryName ||
    !expressService ||
    !deliveryService ||
    !operationHours ||
    !location
  ) {
    return res
      .status(400)
      .json({ message: "All fields are required", success: false });
  }

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    partner.laundryName = laundryName;
    partner.expressServices = expressService;
    partner.deliveryServices = deliveryService;
    partner.hours = {
      monday: operationHours.monday,
      tuesday: operationHours.tuesday,
      wednesday: operationHours.wednesday,
      thursday: operationHours.thursday,
      friday: operationHours.friday,
      saturday: operationHours.saturday,
    };
    partner.location = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    await partner.save();
    res.status(200).json({
      message: "Services and location added successfully",
      success: true,
      laundryName: partner.laundryName,
      expressServices: partner.expressServices,
      deliveryServices: partner.deliveryServices,
      hours: partner.hours,
      location: partner.location,
    });
  } catch (error) {
    console.error("Error adding services and location:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.updateServicesAndLocation = async (req, res) => {
  const {
    laundryName,
    expressService,
    deliveryService,
    operationHours,
    location,
  } = req.body;
  const partnerId = req.partner.id;

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Update only the provided fields
    if (laundryName) partner.laundryName = laundryName;
    if (expressService) partner.expressServices = expressService;
    if (deliveryService) partner.deliveryServices = deliveryService;
    if (operationHours) {
      partner.hours = {
        ...partner.hours,
        ...operationHours,
      };
    }
    if (location) {
      partner.location = {
        ...partner.location,
        ...location,
      };
    }

    await partner.save();
    res.status(200).json({
      message: "Services and location updated successfully",
      success: true,
      laundryName: partner.laundryName,
      expressServices: partner.expressServices,
      deliveryServices: partner.deliveryServices,
      hours: partner.hours,
      location: partner.location,
    });
  } catch (error) {
    console.error("Error updating services and location:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

exports.uploadPartnerLogo = (req, res) => {
  // Specify the folder name (e.g., 'partners')
  const uploadSingle = createUpload("partners").single("image"); // Create the upload middleware

  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded!", success: false });
    }

    try {
      // Find the existing partner by ID or name
      const partnerId = req.partner.id; // Get partnerId from the request body
      const partner = await Partner.findById(partnerId); // Fetch the partner from the database

      if (!partner) {
        return res
          .status(404)
          .json({ message: "Partner not found!", success: false });
      }

      // Check if the partner has an existing logo and delete it from S3
      if (partner.logo) {
        console.log("Deleting existing logo from S3...", partner.logo);
        await deleteImageFromS3(partner.logo); // Call the delete service
      }

      // Update the logoUrl field with the new image URL
      partner.logo = req.file.location; // Store the new logo URL
      await partner.save(); // Save the updated partner document

      // Successful upload response
      res.status(200).json({
        message: "File uploaded and partner logo updated successfully!",
        success: true,
        partner: partner, // Return the updated partner data
      });
    } catch (error) {
      res.status(500).json({
        message: "Error updating partner logo in database",
        success: false,
        error: error.message,
      });
    }
  });
};

exports.uploadImages = (req, res) => {
  const uploadMultipleImages = createUpload("partners").array("image", 10); // Adjust the field name as needed
  uploadMultipleImages(req, res, async (err) => {
    if (err) {
      console.error(`Upload error: ${err.message}`);
      return res
        .status(400)
        .json({ message: `File upload error: ${err.message}`, success: false });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "No image files uploaded!", success: false });
    }

    try {
      const partnerId = req.partner.id; // Assume partner ID is available in req.partner
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return res
          .status(404)
          .json({ message: "Partner not found!", success: false });
      }

      // Update the images array with the new image URLs
      const imageUrls = req.files.map((file) => file.location); // Get the S3 URLs from the uploaded files
      partner.images = [...partner.images, ...imageUrls]; // Append new images to existing images
      await partner.save(); // Save the updated partner document

      // Successful upload response
      res.status(200).json({
        message: "Images uploaded successfully!",
        success: true,
        partner: partner, // Return the updated partner data
      });
    } catch (error) {
      console.error(`Error updating partner images: ${error.message}`);
      res.status(500).json({
        message: "Error updating partner images in database",
        success: false,
        error: error.message,
      });
    }
  });
};

exports.deleteImage = async (req, res) => {
  const { imageUrl } = req.body; // Get the image URL from the request body
  const partnerId = req.partner.id; // Assume partner ID is available in req.partner

  if (!imageUrl || !partnerId) {
    return res.status(400).json({
      message: "Image URL and Partner ID are required.",
      success: false,
    });
  }

  try {
    // Call the function to delete the image from S3
    await deleteImageFromS3(imageUrl);

    // Find the partner by ID and update their images array
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found.", success: false });
    }

    // Remove the image URL from the partner's images array
    partner.images = partner.images.filter((img) => img !== imageUrl);
    await partner.save(); // Save the updated partner document

    res.status(200).json({
      message: "Image deleted successfully.",
      success: true,
      partner: partner, // Return the updated partner data
    });
  } catch (error) {
    console.error(`Error deleting image: ${error.message}`);
    res.status(500).json({
      message: "Error deleting image from S3 or updating partner record.",
      success: false,
      error: error.message,
    });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const {
      code,
      discountType,
      discountValue,
      maxDiscount,
      minOrderPrice,
      isFirstTimeUser,
      expiryDate,
      isActive,
    } = req.body;

    // Ensure the partner exists
    const partner = await Partner.findById(partnerId);
    if (!partner)
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });

    // Check if all required fields are present
    if (
      !code ||
      !discountType ||
      !discountValue ||
      !maxDiscount ||
      !minOrderPrice ||
      isFirstTimeUser === undefined ||
      !expiryDate ||
      isActive === undefined
    ) {
      return res
        .status(400)
        .json({ message: "All fields are required", success: false });
    }

    // Create the coupon with a reference to the partner
    const newCoupon = new Coupon({
      code,
      discountType,
      discountValue,
      maxDiscount,
      minOrderPrice,
      isFirstTimeUser,
      expiryDate,
      isActive,
      partner: partnerId,
    });

    await newCoupon.save();

    // Add the coupon to the partner's coupons array
    partner.coupons.push(newCoupon._id);
    await partner.save();

    res.status(201).json({
      message: "Coupon created successfully",
      coupon: newCoupon,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating coupon",
      error: error.message,
      success: false,
    });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const partnerId = req.partner.id;
    const {
      code,
      discountType,
      discountValue,
      maxDiscount,
      minOrderPrice,
      isFirstTimeUser,
      expiryDate,
      isActive,
    } = req.body;

    // Validate the couponId
    if (!couponId) {
      return res
        .status(400)
        .json({ message: "Coupon ID is required", success: false });
    }

    // Validate the partnerId
    if (!partnerId) {
      return res
        .status(400)
        .json({ message: "Partner ID is required", success: false });
    }

    // Find the coupon and ensure it belongs to the partner
    const coupon = await Coupon.findOne({
      _id: couponId,
      partner: partnerId,
      success: false,
    });
    if (!coupon) {
      return res
        .status(404)
        .json({ message: "Coupon not found", success: false });
    }

    // Update the coupon fields if they are provided in the request body
    if (code !== undefined) coupon.code = code;
    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount;
    if (minOrderPrice !== undefined) coupon.minOrderPrice = minOrderPrice;
    if (isFirstTimeUser !== undefined) coupon.isFirstTimeUser = isFirstTimeUser;
    if (expiryDate !== undefined) coupon.expiryDate = expiryDate;
    if (isActive !== undefined) coupon.isActive = isActive;

    // Validate the updated coupon fields
    if (coupon.discountValue < 0) {
      return res
        .status(400)
        .json({ message: "Discount value cannot be negative", success: false });
    }
    if (coupon.maxDiscount < 0) {
      return res
        .status(400)
        .json({ message: "Max discount cannot be negative", success: false });
    }
    if (coupon.minOrderPrice < 0) {
      return res.status(400).json({
        message: "Min order price cannot be negative",
        success: false,
      });
    }
    if (new Date(coupon.expiryDate) < new Date()) {
      return res
        .status(400)
        .json({ message: "Expiry date cannot be in the past", success: false });
    }

    await coupon.save();

    res
      .status(200)
      .json({ message: "Coupon updated successfully", success: true, coupon });
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({
      message: "Error updating coupon",
      error: error.message,
      success: false,
    });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const partnerId = req.partner.id;

    // Validate the partnerId
    if (!partnerId) {
      return res
        .status(400)
        .json({ message: "Partner ID is required", success: false });
    }

    // Find the partner and populate the coupons
    const partner = await Partner.findById(partnerId).populate("coupons");
    if (!partner) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    res.status(200).json({ coupons: partner.coupons, success: true });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      message: "Error fetching coupons",
      error: error.message,
      success: false,
    });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const partnerId = req.partner.id;

    // Validate the couponId
    if (!couponId) {
      return res
        .status(400)
        .json({ message: "Coupon ID is required", success: false });
    }

    // Validate the partnerId
    if (!partnerId) {
      return res
        .status(400)
        .json({ message: "Partner ID is required", success: false });
    }

    // Find the coupon and ensure it belongs to the partner
    const coupon = await Coupon.findOne({ _id: couponId, partner: partnerId });
    if (!coupon) {
      return res
        .status(404)
        .json({ message: "Coupon not found", success: false });
    }

    // Delete the coupon
    await Coupon.deleteOne({ _id: couponId });

    // Remove the coupon from the partner's coupons array
    const partner = await Partner.findById(partnerId);
    partner.coupons = partner.coupons.filter(
      (id) => id.toString() !== couponId
    );
    await partner.save();

    res
      .status(200)
      .json({ message: "Coupon deleted successfully", success: true });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({
      message: "Error deleting coupon",
      error: error.message,
      success: false,
    });
  }
};
