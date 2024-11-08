import { Response, NextFunction } from "express";
import { CustomRequest } from "../types/customRequest"; // Assuming you've extended the Request type
import { Admin } from "../models/admin"; // Assuming you have your Admin model here

const superAdminProtectionMiddleware = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: "Forbidden: No user role found" });
  }

  const { role } = req.user;
  // If admin tries to modify a superadmin
  const adminId = req.params.id;
  if (adminId) {
    const targetAdmin = await Admin.findById(adminId);
    if (!targetAdmin)
      return res.status(404).json({ message: "Admin not found" });

    // Prevent admin from modifying/deleting a superadmin or another admin
    if (targetAdmin.role === "superadmin" && role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Forbidden: You cannot modify a superadmin" });
    }

    if (targetAdmin.role === "admin" && role === "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin cannot modify another admin" });
    }
  }

  // Proceed to the next middleware
  next();
};

export default superAdminProtectionMiddleware;
