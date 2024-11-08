import Parent from "../models/parent"; // Import the Parent model
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { Region } from "../models/region";
import { redisClient } from "../config/redisDbTTL"; // Redis client for OTP
import { sendOTP } from "../utils/sendotp"; // Import your OTP service utility
import { sendEmail } from "../utils/emailHelper";
import { cleanUpExpiredTokens } from "../utils/tokenCleanup";
import { isEmail } from "../utils/isEmail";
import { UserCustomRequest } from "../types/customRequest";
import { clearUserTokens } from "../utils/clearUserToken";

const TOKEN_EXPIRATION = 30 * 24 * 60 * 60; // 30 days in seconds
const MAX_DEVICES = 3;
const MAX_ATTEMPTS = 5; // Maximum login attempts allowed
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes lockout

// Register User Controller (Step 1: OTP Generation)
export const registerUserController = async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    phone,
    gender,
    region,
    dateOfBirth,
  } = req.body;

  try {
    const reg = await Region.findOne({ regionName: region });

    if (!reg) {
      return res.status(404).json({ message: "Region not found" });
    }
    // Check if email or phone already exists in DB
    const existingParent = await Parent.findOne({
      $or: [{ email }, { phone }],
    });
    if (existingParent) {
      return res.status(400).json({ message: "Email or phone already in use" });
    }

    // Check if password matches confirmPassword
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // OTP generation (6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Create OTP key for Redis
    const otpKey = `otp:${phone}`;

    // Store user input (except password) and OTP in Redis with an expiry of 5 minutes
    await redisClient.setEx(
      otpKey,
      300, // 5-minute expiry
      JSON.stringify({
        otp: otp.toString(),
        name,
        email,
        phone,
        gender,
        region: reg._id,
        dateOfBirth,
        password, // Store password temporarily until OTP verification
      })
    );

    // Send OTP to the user's phone
    await sendOTP(phone, otp); // Use your preferred OTP service

    // Return the OTP key (not the actual OTP) for frontend to use in the next step
    return res.status(200).json({
      message: "OTP sent to phone. Please verify to complete registration.",
      otpKey,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res
        .status(500)
        .json({ message: "Error generating OTP", error: err.message });
    }

    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Verify OTP Controller (Step 2: OTP Verification and User Creation)
export const verifyOTPController = async (req: Request, res: Response) => {
  const { otp, otpKey } = req.body; // Receive OTP and OTP key from frontend

  try {
    // Retrieve user data and OTP from Redis using the otpKey
    const storedData = await redisClient.get(otpKey);
    if (!storedData) {
      return res
        .status(400)
        .json({ message: "OTP expired or invalid. Please try again." });
    }

    const {
      otp: storedOTP,
      name,
      email,
      phone,
      gender,
      region,
      dateOfBirth,
      password,
    } = JSON.parse(storedData);

    // Check if OTP matches
    if (storedOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Create new user if OTP is valid
    const newParent = new Parent({
      name,
      email,
      password, // No need to hash the password, it will be done in the Parent model pre-save middleware
      phone,
      gender,
      region,
      dateOfBirth: new Date(dateOfBirth),
      defaultChild: null, // Can be set later
      children: [], // Empty list initially
    });

    // Save the new user in the database
    await newParent.save();

    // Compose and send email confirmation
    const emailContent = {
      to: email,
      name,
      subject: "Account Created Successfully",
      text: `Hello ${name},\n\nYour account has been created successfully!\n\nBest regards,\nYour Team`,
      html: `<strong>Hello ${name},</strong><br><p>Your account has been created successfully!</p><p>Best regards,<br>Your Team</p>`,
    };

    await sendEmail(emailContent); // Send the email
    // Delete the OTP and user data from Redis after successful verification
    await redisClient.del(otpKey);

    // Return success response
    return res.status(201).json({ message: "User registered successfully." });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res
        .status(500)
        .json({ message: "Error verifying OTP", error: err.message });
    }

    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// User Login and stored in Redis database
export const userLogin = async (req: Request, res: Response) => {
  const { input, password } = req.body;

  try {
    const query = isEmail(input)
      ? { email: input.toLowerCase() }
      : { phone: input };
    const parent = await Parent.findOne(query);

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Check if the account is locked
    if (parent.lockUntil && new Date() < parent.lockUntil) {
      return res.status(403).json({
        message: `Account locked. Try again after ${parent.lockUntil.toLocaleString()}`,
      });
    }

    const passwordMatch = await parent.comparePassword(password);
    if (!passwordMatch) {
      parent.loginAttempts += 1;

      if (parent.loginAttempts >= MAX_ATTEMPTS) {
        parent.lockUntil = new Date(Date.now() + LOCKOUT_TIME);
        await parent.save();
        return res.status(403).json({
          message: `Too many failed attempts. Account locked for 30 minutes.`,
        });
      }

      await parent.save();
      return res.status(401).json({ message: "Password Incorrect" });
    }

    // Reset login attempts after successful login
    parent.loginAttempts = 0;
    parent.lockUntil = null;
    await parent.save();

    // Generate token
    const jwtSecret = process.env.JWT_SECRET_KEY;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret is missing" });
    }

    // Clean up expired tokens
    const tokenSetKey = `parentTokens:${parent._id.toString()}`;
    await cleanUpExpiredTokens(parent, "parentTokens");

    // Check the number of existing active tokens (devices)
    const existingTokens = await redisClient.sMembers(tokenSetKey);
    const currentActiveTokensCount = existingTokens.length;

    if (currentActiveTokensCount >= MAX_DEVICES) {
      // If the limit is reached, return a message indicating that
      return res.status(429).json({
        message:
          "Maximum login limit reached. Please log out from another device to continue.",
      });
    }

    // Create a new token
    const token = jwt.sign({ id: parent._id }, jwtSecret, { expiresIn: "30d" });
    const tokenKey = `jwtToken:${parent._id.toString()}:${token}`;
    await redisClient.set(tokenKey, token, { EX: TOKEN_EXPIRATION }); // 30 days

    // If not exceeding the device limit, add the new token to Redis
    await redisClient.sAdd(tokenSetKey, tokenKey);

    // Send response with token and other relevant data
    res.status(200).json({
      token,
      region: parent.region,
      defaultChild: parent.defaultChild,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(500).json({ message: "Error logging in", error: err.message });
    } else {
      res.status(500).json({ message: "Unknown error occurred" });
    }
  }
};

// Logout from a single device
export const logout = async (req: UserCustomRequest, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1]; // Assuming Bearer token is sent in the header
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  if (!req.user) {
    return res.status(403).json({ message: "User is not authenticated." });
  }

  const tokenKey = `jwtToken:${req.user.id}:${token}`; // Construct the token key based on user ID
  try {
    // Remove the token from Redis
    await redisClient.del(tokenKey);

    // Remove the token from the user's set of active tokens
    const tokenSetKey = `parentTokens:${req.user.id}`; // User's token set key
    await redisClient.sRem(tokenSetKey, tokenKey);

    res
      .status(200)
      .json({ message: "Successfully logged out from this device" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Error logging out" });
  }
};

// Logout from all devices
export const logoutAllDevices = async (
  req: UserCustomRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new Error("User is not authenticated.");
    }
    await clearUserTokens(req.user.id.toString());
    res
      .status(200)
      .json({ message: "Successfully logged out from all devices" });
  } catch (error) {
    console.error("Error during logout all devices:", error);
    res.status(500).json({ message: "Error logging out from all devices" });
  }
};

// Change user Password
export const changePasswordBeforeLogin = async (req: Request, res: Response) => {
  const { phone } = req.body;

  try {
    // Find the parent by phone number
    const parent = await Parent.findOne({ phone });
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Generate OTP (for simplicity, we'll use a random 6-digit number)
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store OTP in Redis with an expiration time (e.g., 5 minutes)
    await redisClient.setEx(`changepasswordOTP:${phone}`, 300, otp.toString());

    // Send OTP via SMS
    await sendOTP(phone, otp);

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Error sending OTP", error });
  }
};

// change password
export const changePassword = async (req: UserCustomRequest, res: Response) => {
  const { otp, currentPassword, newPassword } = req.body; // Extract relevant fields
  const phone = req.body.phone; // This would be required for the OTP case
  let redisOtpKey;
  // Find the parent by phone number (assuming phone number is unique)
  const parent = await Parent.findOne({ phone });
  if (!parent) {
    return res.status(404).json({ message: "Parent not found." });
  }
  try {
    // Case 1: Before login (OTP-based password reset)
    if (otp && phone) {
      redisOtpKey = `changepasswordOTP:${phone}`;

      // Get the OTP from Redis
      const storedOtp = await redisClient.get(redisOtpKey);

      if (!storedOtp) {
        return res.status(400).json({ message: "OTP expired or invalid." });
      }

      if (storedOtp !== otp) {
        return res.status(400).json({ message: "Incorrect OTP." });
      }
    } else if (req.user) {
      // Verify current password
      const isMatch = await parent.comparePassword(currentPassword);
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect." });
      }
    } else {
      return res.status(400).json({
        message:
          "Invalid request. Either OTP or current password required for password change.",
      });
    }
    // Update the password after current password verification
    parent.password = newPassword;
    await parent.save();

    // Compose and send email confirmation
    const emailContent = {
      to: parent.email,
      name: parent.name,
      subject: "Password Changed Successfully",
      text: `Hello ${parent.name},\n\nYour account password changed successfully!\n\nBest regards,\nYour Team`,
      html: `<strong>Hello ${parent.name},</strong><br><p>Your account Password has been changed successfully!</p><p>Best regards,<br>Your Team</p>`,
    };

    await sendEmail(emailContent); // Send the email
    if (redisOtpKey) {
      // Clear the OTP from Redis
      await redisClient.del(redisOtpKey);
    }
    // Clear all tokens after password change (logged in scenario)
    await clearUserTokens(parent._id.toString());

    return res.status(200).json({ message: "Password changed successfully ." });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ message: "Error changing password", error });
  }
};
