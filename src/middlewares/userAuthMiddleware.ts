import {Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { redisClient } from "../config/redisDbTTL"; // Import your Redis client
import Parent from "../models/parent";
import { UserCustomRequest } from "../types/customRequest";

// User Authentication Middleware
export const userAuthMiddleware = async (req: UserCustomRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1]; // Assuming Bearer token is sent in the header

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify token
    const jwtSecret = process.env.JWT_SECRET_KEY;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret is missing" });
    }

    const decodedToken = jwt.verify(token, jwtSecret) as { id: string };
    
    // Check if the token is still valid in Redis
    const tokenKey = `jwtToken:${decodedToken.id}:${token}`;
    const tokenExists = await redisClient.exists(tokenKey);

    if (!tokenExists) {
      return res.status(401).json({ message: "Token is no longer valid" });
    }

    // Find the parent by ID and set it in req.user
    const parent = await Parent.findById(decodedToken.id);
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    req.user = { id: parent._id, region: parent.region, defaultChild: parent.defaultChild }; // Set parent ID in req.user
    next(); // Proceed to the next middleware or route handler
  }catch (error) {
    console.error("Error in authentication middleware:", error);
    if (error instanceof Error) {
      return res.status(401).json({ message: "Invalid token", error: error.message });
    } else {
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  }
};
