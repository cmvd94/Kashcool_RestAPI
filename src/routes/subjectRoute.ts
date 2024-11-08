// src/routes/subjectRoutes.ts
import { Router } from "express";

import upload from "../config/multerConfig";
import { addSubject, editSubject, deleteSubjectController} from "../controllers/subjectController";
import AdminAuthMiddleware from "../middlewares/AdminAuthMiddleware";
import roleAuthMiddleware from "../middlewares/roleAuthMiddleware";

const router = Router();

// Add subject with image upload
router.post(
  "/add-subject/:semesterName",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  upload.single("media"),
  addSubject
);

// Update subject with image upload
router.patch(
  "/edit-subject/:semesterName/:subjectId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  upload.single("media"),
  editSubject
);

// Delete subject 
router.delete(
  "/:semesterName/:subjectId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager"]),
  deleteSubjectController
);


export default router;
