const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // Unique coupon code
  discountType: { type: String, enum: ["percentage", "amount"], required: true }, // Type of discount ('percentage' or 'amount')
  discountValue: { type: Number, required: true }, // Value of discount (either percentage or rupees off)
  maxDiscount: { type: Number, default: 0 }, // Maximum discount limit (optional, used with percentage discounts)
  minOrderPrice: { type: Number, default: 0 }, // Minimum order price for the coupon to be applicable (optional)
  isFirstTimeUser: { type: Boolean, default: false }, // Whether the coupon is only for first-time users
  expiryDate: { type: Date }, // Expiry date of the coupon (optional)
  isActive: { type: Boolean, default: true }, // Whether the coupon is currently active
}, {
  timestamps: true // Automatically add createdAt and updatedAt timestamps
});

module.exports = mongoose.model("Coupon", CouponSchema);
