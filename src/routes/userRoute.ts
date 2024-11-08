// routes/userRoutes.ts
import express from "express";
import {
  registerUserController,
  verifyOTPController,
  userLogin,
  logout,
  logoutAllDevices,
  changePasswordBeforeLogin,
  changePassword,
} from "../controllers/userController";
import { userAuthMiddleware } from "../middlewares/userAuthMiddleware";

const router = express.Router();

// Route for registration (with OTP generation)
router.post("/register", registerUserController);

// Route for OTP verification
router.post("/verify-otp", verifyOTPController);

// User Login
router.post("/login", userLogin);

// ForgotPassword - change password in login page
router.post("/otpChangePasswordInLoginPage", changePasswordBeforeLogin);

// change password before login
router.post("/changePasswordInLoginPage", changePassword);

// change password after login
router.post("/changePasswordAfterLogin", userAuthMiddleware, changePassword);

// User single device logout
router.post("/logout", userAuthMiddleware, logout);

// User all device logout
router.post("/logout-all", userAuthMiddleware, logoutAllDevices);

export default router;
