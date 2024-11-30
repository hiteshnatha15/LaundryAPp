const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
    }, // Unique Order ID
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Partner",
        required: true,
    }, // Reference to the Partner
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true,
    }, // Reference to the Customer
    items: [
        {
            itemName: String, // e.g., 'shirt'
            method: String, // e.g., 'regular wash'
            image: String, // URL or path to the image of the item
            instructions: String,
            price: Number, // Price for the method
            quantity: { type: Number, default: 1 }, // Quantity of the item
        },
    ],
    totalAmount: { type: Number, required: true }, // Total amount for the order
    orderDate: { type: Date, default: Date.now }, // Order creation date
    deliveryDate: Date, // Expected delivery date
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Completed", "Cancelled"],
        default: "Pending",
    }, // Order status
    scheduleDetails: {
        name: { type: String, required: true }, // Name of the person scheduling
        mobileNumber: { type: String, required: true }, // Mobile number
        location: {
            address: { type: String, required: true }, // Address for pickup or delivery
            longitude: { type: Number, required: true }, // Longitude coordinate
            latitude: { type: Number, required: true }, // Latitude coordinate
        },
        date: { type: Date, required: true }, // Scheduled date
        time: { type: String, required: true }, // Scheduled time
    }, // Schedule details
    coupon: {
        code: { type: String }, // Coupon code
        discount: { type: Number, default: 0 }, // Discount value applied
    }, // Coupon details
    delivery: {
        deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery" }, // Reference to a DeliveryPartner model
        name: { type: String }, // Name of the delivery partner
        contactNumber: { type: String }, // Contact number of the delivery partner
    }, // Delivery partner details
});

module.exports = mongoose.model("Order", OrderSchema);
