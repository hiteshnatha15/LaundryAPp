const express = require("express");
const router = express.Router();
const {
  createDeliveryPartner,
  loginDeliveryPartner,
  verifyDeliveryLogin,
  updateDeliveryPartner,
  getDeliveryPartner,
} = require("../controllers/deliveryController");
const { deliveryAuth } = require("../middlewares/deliveryAuth");

router.post("/api/deliveryPartnerSignup", createDeliveryPartner);
router.post("/api/deliveryPartnerLogin", loginDeliveryPartner);
router.post("/api/verifyDeliveryPartnerLogin", verifyDeliveryLogin);
router.put("/api/updateDeliveryPartner", deliveryAuth, updateDeliveryPartner);
router.get("/api/deliveryPartner", deliveryAuth, getDeliveryPartner);

module.exports = router;
