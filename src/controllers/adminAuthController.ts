import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Admin, AdminDocument } from "../models/admin";
import { Region } from "../models/region";
import { logAdminAction } from "../utils/logAdminAction";
import { redisClient } from "../config/redisDbTTL";
import { CustomRequest } from "../types/customRequest";
import { cleanUpExpiredTokens } from "../utils/tokenCleanup";
import { Grade } from "../models/grade";

const TOKEN_EXPIRATION = 3600; //Redis token ExpireTime
// Web Admin Login
export const adminLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email })
      .populate("region") // Populate the region field
      .exec();
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const passwordMatch = await admin.comparePassword(password);
    if (!passwordMatch) {
      return res.status(404).json({ message: "Password Incorrect" });
    }

    const jwtSecret = process.env.JWT_SECRET_KEY;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret is missing" });
    }

    // Clean up expired tokens for the admin
    await cleanUpExpiredTokens(admin, "adminTokens");
    
    const token = jwt.sign({ id: admin._id, role: admin.role }, jwtSecret, {
      expiresIn: "1hr",
    });

    // Store the token in Redis with expiration
    const tokenKey = `jwtToken:${admin._id.toString()}:${token}`;
    await redisClient.set(tokenKey, token, { EX: TOKEN_EXPIRATION });

    // Add the tokenKey to a SET to keep track of all tokens for the admin
    await redisClient.sAdd(`adminTokens:${admin._id.toString()}`, tokenKey);

    // Get the region name if the region is populated
    let regionName: string | null = null;
    if (
      admin.region &&
      typeof admin.region === "object" &&
      "regionName" in admin.region
    ) {
      regionName = (admin.region as any).regionName;
    }

    res.status(200).json({ token: token, region: regionName ,grade: admin.grade});
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(500).json({ message: "Error logging in", error: err.message });
    } else {
      res.status(500).json({ message: "Unknown error occurred" });
    }
  }
};

// Get all admins
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins: AdminDocument[] = await Admin.find();
    await logAdminAction(req, "Get All Admins", true, "Admin", null);
    res.status(200).json(admins);
  } catch (err: unknown) {
    await logAdminAction(
      req,
      "Get All Admins",
      false,
      "Admin",
      null,
      err instanceof Error ? err.message : "Unknown error"
    );
    res.status(500).json({
      message: "Error fetching admins",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

// Create a new admin
export const createAdmin = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      await logAdminAction(
        req,
        "Create Admin",
        false,
        "Admin",
        existingAdmin._id.toString(),
        "Admin already exists"
      );
      return res.status(400).json({ message: "Admin already exists" });
    }

    //const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({
      name,
      email,
      //password: hashedPassword,
      password,
      role,
    });

    await newAdmin.save();
    await logAdminAction(
      req,
      "Create Admin",
      true,
      "Admin",
      newAdmin._id.toString()
    );
    res.status(201).json({ message: "Admin created successfully" });
  } catch (err: unknown) {
    await logAdminAction(
      req,
      "Create Admin",
      false,
      "Admin",
      null,
      err instanceof Error ? err.message : "Unknown error"
    );
    res.status(500).json({
      message: "Error creating admin",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

// Update an admin's details
export const updateAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  try {
    const admin = await Admin.findById(id);
    if (!admin) {
      await logAdminAction(
        req,
        "Update Admin",
        false,
        "Admin",
        id,
        "Admin not found"
      );
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.name = name || admin.name;
    admin.email = email || admin.email;
    admin.role = role || admin.role;

    await admin.save();

    // Remove all tokens for the admin
    const tokenKeys = await redisClient.sMembers(`adminTokens:${admin._id.toString()}`);
    for (const tokenKey of tokenKeys) {
      await redisClient.del(tokenKey); // Remove each token
    }
    await redisClient.del(`adminTokens:${admin._id.toString()}`); // Remove the SET itself

    await logAdminAction(
      req,
      "Update Admin",
      true,
      "Admin",
      admin._id.toString()
    );
    res.status(200).json({ message: "Admin updated successfully" });
  } catch (err: unknown) {
    await logAdminAction(
      req,
      "Update Admin",
      false,
      "Admin",
      id,
      err instanceof Error ? err.message : "Unknown error"
    );
    res.status(500).json({
      message: "Error updating admin",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
// Delete an admin
export const deleteAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const admin = await Admin.findById(id);
    if (!admin) {
      await logAdminAction(
        req,
        "Delete Admin",
        false,
        "Admin",
        id,
        "Admin not found"
      );
      return res.status(404).json({ message: "Admin not found" });
    }

    await Admin.findByIdAndDelete(id);

     // Remove all tokens for the admin
     const tokenKeys = await redisClient.sMembers(`adminTokens:${admin._id.toString()}`);
     for (const tokenKey of tokenKeys) {
       await redisClient.del(tokenKey); // Remove each token
     }
     await redisClient.del(`adminTokens:${admin._id.toString()}`); // Remove the SET itself
 

    await logAdminAction(req, "Delete Admin", true, "Admin", id);
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err: unknown) {
    await logAdminAction(
      req,
      "Delete Admin",
      false,
      "Admin",
      id,
      err instanceof Error ? err.message : "Unknown error"
    );
    res.status(500).json({
      message: "Error deleting admin",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

// Get details of a specific admin
export const getAdminById = async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    const admin = await Admin.findById(id);
    if (!admin) {
      await logAdminAction(
        req,
        "Get Admin By ID",
        false,
        "Admin",
        id,
        "Admin not found"
      );
      return res.status(404).json({ message: "Admin not found" });
    }

    await logAdminAction(
      req,
      "Get Admin By ID",
      true,
      "Admin",
      admin._id.toString()
    );
    res.status(200).json(admin);
  } catch (err: unknown) {
    await logAdminAction(
      req,
      "Get Admin By ID",
      false,
      "Admin",
      id,
      err instanceof Error ? err.message : "Unknown error"
    );
    res.status(500).json({
      message: "Error fetching admin details",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

// admin password change
export const changePassword = async (req: CustomRequest, res: Response) => {
  console.log("inside change password");
  const { oldPassword, newPassword } = req.body;
  console.log(oldPassword, newPassword);

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Old and new passwords are required" });
  }

  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: "Forbidden: No user role found" });
  }

  try {
    const adminId = req.user.id; // Assuming `req.user.id` is set by authentication middleware
    const admin = await Admin.findById(adminId);
    console.log(admin);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if the old password is correct
    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    admin.password = newPassword;
    await admin.save();

     // Remove all tokens for the admin
     const tokenKeys = await redisClient.sMembers(`adminTokens:${admin._id.toString()}`);
     for (const tokenKey of tokenKeys) {
       await redisClient.del(tokenKey); // Remove each token
     }
     await redisClient.del(`adminTokens:${admin._id.toString()}`); // Remove the SET itself
 

    await logAdminAction(
      req,
      "Password change",
      true,
      "Admin",
      admin._id.toString()
    );
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// Admin Region Update
export const updateRegionForAdmin = async (
  req: CustomRequest,
  res: Response
) => {
  const { region } = req.body;
  if (!req.user) {
    return res.status(403).json({ message: "Forbidden: No user role found" });
  }

  const adminId = req.user.id; // Assuming `req.user` is set by your auth middleware and contains the logged-in admin's ID

  if (!region) {
    return res.status(400).json({ message: "Region is required" });
  }

  try {
    const admin = await Admin.findById(adminId);

    if (!admin) {
      await logAdminAction(
        req,
        "Update Region",
        false,
        "Admin",
        adminId.toString(),
        "Admin not found"
      );
      return res.status(404).json({ message: "Admin not found" });
    }

    const regionExists = await Region.findOne({ regionName: region });
    if (!regionExists) {
      return res.status(404).json({ message: "Region not found" });
    }
    // Update region for the admin
    admin.region = regionExists._id;
    await admin.save();

    //No need to invalidate token.

    // Log the admin action
    await logAdminAction(
      req,
      "Update Region",
      true,
      "Admin",
      admin._id.toString(),
      `Region changed to ${region}`
    );

    // Return the updated admin with the new region
    res
      .status(200)
      .json({ message: "Region updated successfully", region: admin.region });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(
        req,
        "Update Region",
        false,
        "Admin",
        adminId.toString(),
        err.message
      );
      res
        .status(500)
        .json({ message: "Error updating region", error: err.message });
    } else {
      res.status(500).json({ message: "Unknown error occurred" });
    }
  }
};

// Admin Grade Update
export const updateGradeForAdmin = async (
  req: CustomRequest,
  res: Response
) => {
  const { grade } = req.body;
  
  if (!req.user) {
    return res.status(403).json({ message: "Forbidden: No user role found" });
  }

  const adminId = req.user.id; // Assuming `req.user` is set by your auth middleware and contains the logged-in admin's ID

  if (!grade) {
    return res.status(400).json({ message: "Grade is required" });
  }

  try {
    const admin = await Admin.findById(adminId);

    if (!admin) {
      await logAdminAction(
        req,
        "Update Grade",
        false,
        "Admin",
        adminId.toString(),
        "Admin not found"
      );
      return res.status(404).json({ message: "Admin not found" });
    }

    const gradeExists = await Grade.findOne({region: req.user.region, grade: grade });
    if (!gradeExists) {
      return res.status(404).json({ message: "Grade not found" });
    }

    // Update grade for the admin
    admin.grade = gradeExists._id;
    await admin.save();

    // Log the admin action
    await logAdminAction(
      req,
      "Update Grade",
      true,
      "Admin",
      admin._id.toString(),
      `Grade changed to ${grade}`
    );

    // Return the updated admin with the new grade
    res.status(200).json({ 
      message: "Grade updated successfully", 
      grade: admin.grade 
    });
    
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(
        req,
        "Update Grade",
        false,
        "Admin",
        adminId.toString(),
        err.message
      );
      res.status(500).json({ message: "Error updating grade", error: err.message });
    } else {
      res.status(500).json({ message: "Unknown error occurred" });
    }
  }
};

// admin Logout
export const adminLogout = async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    return res.status(403).json({ message: "Forbidden: No user role found" });
  }

  const adminId = req.user.id; // Assuming `req.user` is set by your auth middleware and contains the logged-in admin's ID
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from headers

  if (!token) {
    return res.status(400).json({ message: "No token provided" });
  }

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      await logAdminAction(
        req,
        "Admin Logout",
        false,
        "Admin",
        adminId.toString(),
        "Admin not found"
      );
      return res.status(404).json({ message: "Admin not found" });
    }

    // Construct the token key for Redis
    const tokenKey = `jwtToken:${admin._id.toString()}:${token}`;

    // Remove the specific JWT token from Redis
    await redisClient.del(tokenKey);

    // Remove the tokenKey from the adminTokens set
    await redisClient.sRem(`adminTokens:${admin._id.toString()}`, tokenKey);

    // Check if there are any remaining tokens for this admin
    const remainingTokens = await redisClient.sMembers(
      `adminTokens:${admin._id.toString()}`
    );
    if (remainingTokens.length === 0) {
      // If no remaining tokens, clear the region field
      admin.region = null;
      admin.grade = null;
      await admin.save();
    }

    // Log the admin logout action
    await logAdminAction(
      req,
      "Admin Logout",
      true,
      "Admin",
      admin._id.toString(),
      "Token removed"
    );

    res.status(200).json({ message: "Logout successful, token removed" });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(
        req,
        "Admin Logout",
        false,
        "Admin",
        adminId.toString(),
        err.message
      );
      res
        .status(500)
        .json({ message: "Error logging out", error: err.message });
    } else {
      res.status(500).json({ message: "Unknown error occurred" });
    }
  }
};
