const express = require("express");
const router = express.Router();
const {
  createDeliveryPartner,
  loginDeliveryPartner,
  verifyDeliveryLogin,
  updateDeliveryPartner,
  getDeliveryPartner,
  verifyDeliveryPartnerSignup,
  updateDeliveryPartnerDocuments,
} = require("../controllers/deliveryController");
const { deliveryAuth } = require("../middlewares/deliveryAuth");
const { updateCoupon } = require("../controllers/partnerController");

router.post("/api/deliveryPartnerSignup", createDeliveryPartner);
router.post("/api/verifyDeliveryPartnerSignup", verifyDeliveryPartnerSignup);
router.post("/api/deliveryPartnerLogin", loginDeliveryPartner);
router.post("/api/verifyDeliveryPartnerLogin", verifyDeliveryLogin);
// router.put("/api/updateDeliveryPartner", deliveryAuth, updateDeliveryPartner);
router.get("/api/deliveryPartner", deliveryAuth, getDeliveryPartner);
router.post(
  "/api/uploadDocuments",
  deliveryAuth,
  updateDeliveryPartnerDocuments
);

module.exports = router;
