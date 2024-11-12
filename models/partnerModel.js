const mongoose = require("mongoose");

const PartnerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  mobile: { type: String, unique: true },
  otp: String,
  otpExpiry: Date,
  profileImage: String,
  laundryName: String, // Laundry name
  expressServices: { type: Boolean, default: false }, // Express services
  deliveryServices: { type: Boolean, default: false }, // Delivery services
  hours: {
    monday: {
      openingTime: String,
      closingTime: String,
    },
    tuesday: {
      openingTime: String,
      closingTime: String,
    },
    wednesday: {
      openingTime: String,
      closingTime: String,
    },
    thursday: {
      openingTime: String,
      closingTime: String,
    },
    friday: {
      openingTime: String,
      closingTime: String,
    },
    saturday: {
      openingTime: String,
      closingTime: String,
    },
    sunday: {
      openingTime: String,
      closingTime: String,
    },
  },
  location: {
    latitude: Number,
    longitude: Number,
  }, // Location coordinates

  categories: [
    {
      name: String, // e.g., 'personal', 'petitems', 'seasonalitems'
      subcategories: [
        {
          name: String, // Subcategory name, e.g., 'clothing', 'bedding'
          items: [
            {
              itemName: String, // e.g., 'shirt', 'trouser'
              methods: [
                {
                  methodName: String, // e.g., 'regular wash', 'dry clean'
                  price: Number, // Price for that method
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  paymentDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    phonePe: String,
    Upi: String,
  }, // Payment details

  logo: String, // URL or path to the logo image
  image1: String, // URL or path to the first image
  image2: String, // URL or path to the second image
  image3: String, // URL or path to the third image
  image4: String, // URL or path to the fourth image
  coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }], // Array of coupon IDs
});

module.exports = mongoose.model("Partner", PartnerSchema);
