import { Router } from "express";
import {
  addGradeToRegion,
  getGrade,
  getAllGrades,
  updateGradeName,
  deleteGradeController,
  addOrUpdateSemester,
  deleteSemester
} from "../controllers/gradeController";
import AdminAuthMiddleware from "../middlewares/AdminAuthMiddleware";
import roleAuthMiddleware from "../middlewares/roleAuthMiddleware";

const router = Router();

// Add a Grade Name with region reference
router.post(
  "/addgrade",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  addGradeToRegion
);

// Get Grade by ID
router.get(
  "/:id",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  getGrade
);

// Get all Grade
router.get(
  "/",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  getAllGrades
);

// update Grade name
router.patch(
  "/:id",
  AdminAuthMiddleware,
  roleAuthMiddleware([
    "superadmin",
    "admin",
    "contentmanager",
    "moderator",
    "support",
  ]),
  updateGradeName
);

// Delete Grade
router.delete(
  "/:gradeId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager"]),
  deleteGradeController
);

// Add or update semester
router.put(
  "/:id/semester",
  AdminAuthMiddleware,
  roleAuthMiddleware([
    "superadmin",
    "admin",
    "contentmanager",
    "moderator",
    "support",
  ]),
  addOrUpdateSemester
);

/* router.put(
  "/:id/semester",
  AdminAuthMiddleware,
  roleAuthMiddleware([
    "superadmin",
    "admin",
    "contentmanager",
    "moderator",
    "support",
  ]),
  addOrUpdateSemester
);
 */
router.delete(
  "/:id/semester/:semesterName",
  AdminAuthMiddleware,
  roleAuthMiddleware([
    "superadmin",
    "admin",
    "contentmanager",
    "moderator",
  ]),
  deleteSemester
);

export default router;
