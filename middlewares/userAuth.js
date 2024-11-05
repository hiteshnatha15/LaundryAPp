const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/userModel");

exports.userAuth = async (req, res, next) => {
  try {
    // Get token from the header
    const authHeader = req.header("Authorization");

    // Check if no token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied", success: false });
    }

    // Extract token from the header
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id from the token
    const user = await User.findById(decoded.id);

    // Check if user exists
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Set user in the request object
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server Error", success: false });
  }
};
