const express = require("express");
const router = express.Router();
const {
  createPartner,
  verifyPartnerSignup,
  loginPartner,
  verifyPartnerLogin,
  getPartnerProfile,
  updatePartnerProfile,
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  addOrUpdatePartnerBankDetails,
  addServicesAndLocation,
  updateServicesAndLocation,
  uploadPartnerLogo,
  uploadImages,
  deleteImage,
  createCoupon,
  updateCoupon,
  getCoupons,
  deleteCoupon,
  uploadPartnerImage,
} = require("../controllers/partnerController");
const { partnerAuth } = require("../middlewares/partnerAuth");

//public routes
router.post("/api/partnerSignup", createPartner);
router.post("/api/verifyPartnerSignup", verifyPartnerSignup);
router.post("/api/partnerLogin", loginPartner);
router.post("/api/verifyPartnerLogin", verifyPartnerLogin);

//protected route
router.get("/api/partner", partnerAuth, getPartnerProfile);
router.put("/api/updatePartner", partnerAuth, updatePartnerProfile);
router.post("/api/category", partnerAuth, addCategory); // Add a category
router.get("/api/categories", partnerAuth, getCategories); // Get all categories
router.put("/api/category/:categoryId", partnerAuth, updateCategory); // Update a category
router.delete("/api/category/:categoryId", partnerAuth, deleteCategory); // Delete a category
router.post(
  "/api/addOrUpdatePartnerBankDetails",
  partnerAuth,
  addOrUpdatePartnerBankDetails
); // Add bank details of partner
router.post("/api/addServicesAndLocation", partnerAuth, addServicesAndLocation);
router.put(
  "/api/updateServicesAndLocation",
  partnerAuth,
  updateServicesAndLocation
);
router.post("/api/upload-partner-logo", partnerAuth, uploadPartnerLogo);
router.post("/api/upload-partner-images", partnerAuth, uploadImages);
router.post("/api/delete-partner-images", partnerAuth, deleteImage);
router.post("/api/create-coupon", partnerAuth, createCoupon);
router.put("/api/update-coupon/:couponId", partnerAuth, updateCoupon);
router.get("/api/get-coupons", partnerAuth, getCoupons);
router.delete("/api/delete-coupon/:couponId", partnerAuth, deleteCoupon);
router.post("/api/upload-partner-image", partnerAuth, uploadPartnerImage);

module.exports = router;
