const jwt = require("jsonwebtoken");
require("dotenv").config();
const Partner = require("../models/partnerModel");

exports.partnerAuth = async (req, res, next) => {
  try {
    // Get token from the header
    const authHeader = req.header("Authorization");

    // Check if no token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    // Extract token from the header
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id from the token
    const partner = await Partner.findById(decoded.id);

    // Check if user exists
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Set user in the request object
    req.partner = partner;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
