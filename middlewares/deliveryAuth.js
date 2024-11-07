const jwt = require("jsonwebtoken");
require("dotenv").config();
const Delivery = require("../models/deliveryModel");

exports.deliveryAuth = async (req, res, next) => {
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
    const delivery = await Delivery.findById(decoded.id);

    // Check if user exists
    if (!delivery) {
      return res
        .status(404)
        .json({ message: "Partner not found", success: false });
    }

    // Set user in the request object
    req.delivery = delivery;
    next();
  } catch (error) {
    console.log("Error authenticating delivery partner:", error);
    res.status(500).json({ message: "Server Error", success: false });
  }
};
