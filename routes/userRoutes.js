const express = require("express");
const router = express.Router();
const {
  createUser,
  verifyUserSignup,
  loginUser,
  verifyUserLogin,
  getUserProfile,
  updateUserProfile
} = require("../controllers/userController");
const { userAuth } = require("../middlewares/userAuth");

//public routes
router.post("/api/userSignup", createUser);
router.post("/api/verifyUserSignup", verifyUserSignup);
router.post("/api/userLogin", loginUser);
router.post("/api/verifyUserLogin", verifyUserLogin);

//protected route
router.get("/api/user", userAuth, getUserProfile);
router.put("/api/updateUser", userAuth, updateUserProfile);

module.exports = router;
