const generateOtp = require("../utils/generateOtp");
const otpService = require("../services/otpService");
const mailOtpService = require("../services/mailOtpService");
const jwt = require("jsonwebtoken");
const createUpload = require("../services/uploadImageService");
const { deleteImageFromS3 } = require("../services/deleteImageService");

exports.createDeliveryPartner = async (req, res) => {
  const { name, email, mobile } = req.body;

  // Check if all fields are present
  if (!name || !email || !mobile) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the user already exists by email or mobile
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email or mobile" });
    }

    // Generate OTPs for mobile and email separately
    const mobileOtp = generateOtp();
    const emailOtp = generateOtp();

    // Create the user with the generated OTPs
    // User data to update or create
    const userData = {
      name,
      email,
      mobile,
      mobileOtp, // Save generated OTP for mobile
      emailOtp, // Save generated OTP for email
      mobileOtpExpiry: new Date(Date.now() + 10 * 60 * 1000), // Mobile OTP expiration time (10 minutes)
      emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000), // Email OTP expiration time (10 minutes)
    };

    // Find the user by email or mobile and update if exists, else create new (upsert: true)
    const user = await UserSignup.findOneAndUpdate(
      { $or: [{ email }, { mobile }] }, // Find by email or mobile
      { $set: userData }, // Update user data
      { new: true, upsert: true } // Create if not found (upsert), return the new or updated document
    );

    // Save the user to the database
    await user.save();

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
      message: "User created successfully, OTP sent to mobile and email",
      user: {
        name,
        email,
        mobile,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    // Handle server error
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyUserSignup = async (req, res) => {
  const { email, mobile, mobileOtp, emailOtp } = req.body;

  // Check if all fields are present
  if (!email || !mobile || !mobileOtp || !emailOtp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Find the user by email or mobile
    const user = await UserSignup.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if mobile OTP matches and has not expired
    if (user.mobileOtp !== mobileOtp) {
      return res.status(400).json({ message: "Invalid mobile OTP" });
    }

    if (user.mobileOtpExpiry < Date.now()) {
      return res.status(400).json({ message: "Mobile OTP has expired" });
    }

    // Check if email OTP matches and has not expired
    if (user.emailOtp !== emailOtp) {
      return res.status(400).json({ message: "Invalid email OTP" });
    }

    if (user.emailOtpExpiry < Date.now()) {
      return res.status(400).json({ message: "Email OTP has expired" });
    }

    await user.save();

    // Create a new entry in the User model after verification
    const newUser = new User({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
    });

    // Save the new user entry in the User model
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser._id, // User's unique ID
        mobile: newUser.mobile,
        email: newUser.email,
      },
      process.env.JWT_SECRET // Use your secret key stored in the .env file
    );

    // Return success response with the token
    res.status(200).json({
      message: "User successfully verified and added to the system",
      user: {
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
      },
      token, // Include the JWT token in the response
    });
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, mobile } = req.body;

  // Check if all fields are present
  if (!email && !mobile) {
    return res.status(400).json({ message: "Email or mobile is required" });
  }

  try {
    // Find the user by email or mobile
    const user = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expiration time (10 minutes)
    await user.save();

    // Return success response
    res.status(200).json({
      message: "OTP sent successfully",
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyUserLogin = async (req, res) => {
  const { email, mobile, otp } = req.body;

  // Check if all fields are present
  if (!otp || (!email && !mobile)) {
    return res
      .status(400)
      .json({ message: "OTP and either email or mobile are required" });
  }

  try {
    // Find the user by email or mobile
    const user = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    // If user not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP matches and has not expired
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id, // User's unique ID
        mobile: user.mobile,
        email: user.email,
      },
      process.env.JWT_SECRET // Use your secret key stored in the .env file
    );

    // Return success response with the token
    res.status(200).json({
      message: "User successfully verified and logged in",
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
      token, // Include the JWT token in the response
    });
  } catch (error) {
    console.error("Error verifying login:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    // Find the user by ID
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User profile fetched successfully",
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  const { name, email, mobile } = req.body;

  // Check if at least one field is present
  if (!name && !email && !mobile) {
    return res.status(400).json({ message: "At least one field is required" });
  }

  try {
    // Find the user by ID
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user data only if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;

    // Save the updated user
    await user.save();

    return res.status(200).json({
      message: "User profile updated successfully",
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.uploadUserImage = (req, res) => {
  const uploadSingleImage = createUpload("users").single("image"); // Adjust the field name as needed
  uploadSingleImage(req, res, async (err) => {
    if (err) {
      console.error(`Upload error: ${err.message}`);
      return res
        .status(400)
        .json({ message: `File upload error: ${err.message}` });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded!" });
    }

    try {
      const userId = req.user.id; // Assume user ID is available in req.user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found!" });
      }

      // Delete the existing image from S3 if it exists
      if (user.profileImage) {
        await deleteImageFromS3(user.profileImage);
      }

      // Update the image URL
      const imageUrl = req.file.location; // Get the S3 URL from the uploaded file
      user.profileImage = imageUrl; // Save the new image URL
      await user.save(); // Save the updated user document

      // Successful upload response
      res.status(200).json({
        message: "Image uploaded successfully!",
        user: user, // Return the updated user data
      });
    } catch (error) {
      console.error(`Error updating user image: ${error.message}`);
      res.status(500).json({
        message: "Error updating user image in database",
        error: error.message,
      });
    }
  });
};

exports.deleteUserImage = async (req, res) => {
  const { imageUrl } = req.body; // Get the image URL from the request body
  const userId = req.user.id; // Assume user ID is available in req.user

  if (!imageUrl || !userId) {
    return res
      .status(400)
      .json({ message: "Image URL and User ID are required." });
  }

  try {
    // Call the function to delete the image from S3
    await deleteImageFromS3(imageUrl);

    // Find the user by ID and update their images array
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Remove the image URL from the user's images array
    user.images = user.images.filter((img) => img !== imageUrl);
    await user.save(); // Save the updated user document

    res.status(200).json({
      message: "Image deleted successfully.",
      user: user, // Return the updated user data
    });
  } catch (error) {
    console.error(`Error deleting image: ${error.message}`);
    res.status(500).json({
      message: "Error deleting image from S3 or updating user record.",
      error: error.message,
    });
  }
};