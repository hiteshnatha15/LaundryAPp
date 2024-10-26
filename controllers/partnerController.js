const PartnerSignup = require("../models/partnerSignupModel");
const Partner = require("../models/partnerModel");
const generateOtp = require("../utils/generateOtp");
const otpService = require("../services/otpService");
const mailOtpService = require("../services/mailOtpService");
const jwt = require("jsonwebtoken");

exports.createPartner = async (req, res) => {
  const { name, email, mobile } = req.body;

  // Check if all fields are present
  if (!name || !email || !mobile) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the user already exists by email or mobile
    const existingPartner = await Partner.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingPartner) {
      return res
        .status(400)
        .json({ message: "Partner already exists with this email or mobile" });
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
      return res.status(500).json({ message: "Failed to send OTP to mobile" });
    }
    if (!otpEmailSent) {
      return res.status(500).json({ message: "Failed to send OTP to email" });
    }

    // If everything is successful, return success response
    res.status(201).json({
      message: "Partner created successfully, OTP sent to mobile and email",
      partner: {
        name,
        email,
        mobile,
      },
    });
  } catch (error) {
    console.error("Error creating partner:", error);
    // Handle server error
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyPartnerSignup = async (req, res) => {
  const { email, mobile, mobileOtp, emailOtp } = req.body;

  // Check if all fields are present
  if (!email || !mobile || !mobileOtp || !emailOtp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Find the user by email or mobile
    const partner = await PartnerSignup.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Check if mobile OTP matches and has not expired
    if (partner.mobileOtp !== mobileOtp) {
      return res.status(400).json({ message: "Invalid mobile OTP" });
    }

    if (partner.mobileOtpExpiry < Date.now()) {
      return res.status(400).json({ message: "Mobile OTP has expired" });
    }

    // Check if email OTP matches and has not expired
    if (partner.emailOtp !== emailOtp) {
      return res.status(400).json({ message: "Invalid email OTP" });
    }

    if (partner.emailOtpExpiry < Date.now()) {
      return res.status(400).json({ message: "Email OTP has expired" });
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
      token, // Include the JWT token in the response
    });
  } catch (error) {
    console.error("Error verifying partner:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.loginPartner = async (req, res) => {
  const { email, mobile } = req.body;

  // Check if all fields are present
  if (!email && !mobile) {
    return res.status(400).json({ message: "Email or mobile is required" });
  }

  try {
    // Find the user by email or mobile
    const partner = await Partner.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
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
      return res.status(500).json({ message: "Failed to send OTP" });
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
    });
  } catch (error) {
    console.error("Error logging in partner:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyPartnerLogin = async (req, res) => {
  const { email, mobile, otp } = req.body;

  // Check if all fields are present
  if (!otp || (!email && !mobile)) {
    return res
      .status(400)
      .json({ message: "OTP and either email or mobile are required" });
  }

  try {
    // Find the user by email or mobile
    const partner = await Partner.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Check if OTP matches and has not expired
    if (partner.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (partner.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
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
      token, // Include the JWT token in the response
    });
  } catch (error) {
    console.error("Error verifying login:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
      },
    });
  } catch (error) {
    console.error("Error fetching partner profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updatePartnerProfile = async (req, res) => {
  const { name, email, mobile } = req.body;

  // Check if at least one field is present
  if (!name && !email && !mobile) {
    return res.status(400).json({ message: "At least one field is required" });
  }

  try {
    // Find the user by ID
    const partner = await Partner.findById(req.partner.id);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
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
    });
  } catch (error) {
    console.error("Error updating partner profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Add a new category
exports.addCategory = async (req, res) => {
  const { category } = req.body; // Category should include name and subcategories
  const partnerId = req.partner.id; // Middleware sets req.partnerId

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Check for duplicate category name
    const duplicateCategory = partner.categories.find(
      (cat) => cat.name === category.name
    );
    if (duplicateCategory) {
      return res
        .status(400)
        .json({ message: "Category with this name already exists" });
    }

    partner.categories.push(category); // Add new category to the partner's categories array
    await partner.save();
    res.status(201).json(partner.categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  const partnerId = req.partner.id; // Middleware sets req.partnerId

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    res.status(200).json(partner.categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  const { categoryId } = req.params; // Category ID from params
  const partnerId = req.partner.id; // Middleware sets req.partnerId

  // Ensure category exists in the request body
  const { category: newCategoryData } = req.body;

  if (!newCategoryData) {
    return res.status(400).json({ message: "Category data is required" });
  }

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Find the index of the category
    const categoryIndex = partner.categories.findIndex(
      (cat) => cat._id.toString() === categoryId
    );
    if (categoryIndex === -1) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update the category data
    partner.categories[categoryIndex] = {
      ...partner.categories[categoryIndex]._doc, // Keep the existing category structure
      ...newCategoryData, // Merge with new category data
    };

    // Save the updated partner document
    await partner.save();

    // Return the updated category
    res.status(200).json(partner.categories[categoryIndex]);
  } catch (error) {
    console.error("Error updating category: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  const { categoryId } = req.params; // Category ID from params
  const partnerId = req.partner.id; // Middleware sets req.partnerId

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Remove category by categoryId
    partner.categories = partner.categories.filter(
      (cat) => cat._id.toString() !== categoryId
    );
    await partner.save();
    res.status(200).json(partner.categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      });
    }

    // If bank details are provided, ensure all fields are present and validate format
    if (isBankDetailsProvided) {
      if (!accountHolderName || !accountNumber || !ifscCode) {
        return res.status(400).json({
          message:
            "Please provide complete bank account details: account holder name, account number, and IFSC code",
        });
      }

      // Validate the account number (e.g., must be numeric and within a reasonable range of digits)
      const accountNumberRegex = /^[0-9]{9,18}$/;
      if (!accountNumberRegex.test(accountNumber)) {
        return res.status(400).json({
          message:
            "Invalid account number. It should be between 9 and 18 digits long.",
        });
      }

      // Validate the IFSC code format (e.g., 4 letters followed by 7 digits)
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(ifscCode)) {
        return res.status(400).json({
          message:
            "Invalid IFSC code. It should follow the format: 4 letters followed by 0 and 6 alphanumeric characters.",
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
        });
      }
    }

    // Find the partner by ID
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
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
      paymentDetails: partner.paymentDetails,
    });
  } catch (error) {
    console.error("Error adding bank details:", error);

    // Handle mongoose validation errors specifically
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        error: error.errors,
      });
    }

    // Handle database connection issues
    if (error.name === "MongoNetworkError") {
      return res.status(503).json({
        message: "Database connection error. Please try again later.",
      });
    }

    // General error response
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.addServicesAndLocation = async (req, res) => {
  const { laundryName, expressService, deliveryService, operationHours, location } = req.body;
  const partnerId = req.partner.id;

  // Check if all fields are present
  if (!laundryName || !expressService || !deliveryService || !operationHours || !location) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
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
      laundryName: partner.laundryName,
      expressServices: partner.expressServices,
      deliveryServices: partner.deliveryServices,
      hours: partner.hours,
      location: partner.location,
    });
  } catch (error) {
    console.error("Error adding services and location:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateServicesAndLocation = async (req, res) => {
  const { laundryName, expressService, deliveryService, operationHours, location } = req.body;
  const partnerId = req.partner.id;

  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
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
      laundryName: partner.laundryName,
      expressServices: partner.expressServices,
      deliveryServices: partner.deliveryServices,
      hours: partner.hours,
      location: partner.location,
    });
  } catch (error) {
    console.error("Error updating services and location:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};