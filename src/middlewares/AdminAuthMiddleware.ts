import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { Admin } from "../models/admin";
import { CustomRequest } from "../types/customRequest"; // Import the custom interface
import { redisClient } from "../config/redisDbTTL";

const AdminAuthMiddleware = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
      return res.status(401).json({ message: "No token provided" });
  }

  try {
      console.log("inside AdminAuthMiddleware");

      // Decode the token to get the payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { id: string; role: string };

      // Find the admin in the database
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
          return res.status(401).json({ message: "Invalid token: Admin not found" });
      }

      // Generate the token key to check in Redis
      const tokenKey = `jwtToken:${decoded.id.toString()}:${token}`;
      const storedToken = await redisClient.get(tokenKey);

      if (storedToken !== token) {
          return res.status(401).json({ message: "Invalid token or session expired" });
      }

      // Handle region: ensure region is either ObjectId or null
      const region = admin.region ?? null;
      const grade = admin.grade ?? null;
      
      // Set the user information in the request object for further processing
      req.user = { id: admin._id, name: admin.name, role: admin.role, region: region ,grade: grade};

      next();
  } catch (err) {
      res.status(401).json({
          message: "Invalid token",
          error: err instanceof Error ? err.message : "Unknown error occurred",
      });
  }
};

export default AdminAuthMiddleware;
