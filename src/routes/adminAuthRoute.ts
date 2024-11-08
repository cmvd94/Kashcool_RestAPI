import { Router } from "express";
import {
  adminLogin,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAdminById,
  changePassword,
  updateRegionForAdmin,
  adminLogout,
  updateGradeForAdmin
} from "../controllers/adminAuthController";
import { getAuditLogs } from "../controllers/auditLogController";
import AdminAuthMiddleware from "../middlewares/AdminAuthMiddleware";
import roleAuthMiddleware from "../middlewares/roleAuthMiddleware";
import superAdminProtectionMiddleware from "../middlewares/SuperAdminProtectionMiddleware";

const router = Router();

// Admin Login
router.post("/login", adminLogin);

// Create a new admin (Only superadmin and admin can create, but admin can't create another admin or superadmin)
router.post(
  "/createadministrator",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  createAdmin
);

// Get all admins (Accessible to all admins)
router.get(
  "/administrator",
  AdminAuthMiddleware,
  roleAuthMiddleware([
    "superadmin",
    "admin",
    "contentmanager",
    "moderator",
    "support",
  ]),
  getAllAdmins
);

// Get an admin by ID (Only superadmin and admin can access)
router.get(
  "/administrator/:id",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  superAdminProtectionMiddleware,
  getAdminById
);

// Update an admin (Only superadmin and admin can update, but admin can't update another admin or superadmin)
router.put(
  "/administrator/:id",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  superAdminProtectionMiddleware,
  updateAdmin
);

// Delete an admin (Only superadmin and admin can delete, but admin can't delete another admin or superadmin)
router.delete(
  "/administrator/:id",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  superAdminProtectionMiddleware,
  deleteAdmin
);

// adminLog with pagination
router.get(
  "/auditlogs",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  getAuditLogs
);

// admin for changing password
router.put("/changepassword", AdminAuthMiddleware, changePassword);

// Set Admin region
router.patch("/region", AdminAuthMiddleware, updateRegionForAdmin);

// Set Admin grade
router.patch("/grade", AdminAuthMiddleware, updateGradeForAdmin);

// Admin Logout
router.post("/logout", AdminAuthMiddleware, adminLogout);

export default router;
