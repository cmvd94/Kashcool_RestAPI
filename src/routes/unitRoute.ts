import express from "express";
import {
  createUnit,
  updateUnit,
  deleteUnitController,
} from "../controllers/unitController";
import AdminAuthMiddleware from "../middlewares/AdminAuthMiddleware";
import roleAuthMiddleware from "../middlewares/roleAuthMiddleware";

const router = express.Router();

// Create Unit
router.post(
  "/:subjectId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  createUnit
);

// Update Unit
router.put(
  "/:unitId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  updateUnit
);

// Delete Unit
router.delete(
  "/:subjectId/:unitId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager"]),
  deleteUnitController
);

export default router;
