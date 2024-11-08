import { Router } from "express";
import {
  createRegion,
  updateRegion,
  deleteRegionController,
  getAllRegions,
  getRegionById,
} from "../controllers/regionController";
import AdminAuthMiddleware from "../middlewares/AdminAuthMiddleware";
import roleAuthMiddleware from "../middlewares/roleAuthMiddleware";

const router = Router();

// Create region
router.post(
  "/createregion",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  createRegion
);

// Update an existing region
router.put(
  "/:id",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  updateRegion
);

// Delete a region
router.delete(
  "/:id",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  deleteRegionController
);

// Get all regions
router.get("/", AdminAuthMiddleware, getAllRegions);

// Get a Region by Id
router.get(
  "/:id",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin"]),
  getRegionById
);

export default router;
