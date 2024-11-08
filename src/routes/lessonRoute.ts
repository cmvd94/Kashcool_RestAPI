import { Router } from "express";
import {
  createLesson,
  updateLesson,
  deleteLessonController,
  addChapterController,
  updateChapterController,
  deleteChapterController,
} from "../controllers/lessonController";
import AdminAuthMiddleware from "../middlewares/AdminAuthMiddleware";
import roleAuthMiddleware from "../middlewares/roleAuthMiddleware";
import upload from "../config/multerConfig";

const router = Router();

router.post(
  "/add-lesson/:unitId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  createLesson
);

router.patch(
  "/update-lesson/:unitId/:lessonId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  updateLesson
);

router.delete(
  "/delete-lesson/:unitId/lessons",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager"]),
  deleteLessonController
);

router.post(
  "/add-chapter/:lessonId",
  AdminAuthMiddleware,
  roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
  upload.single("chapterContent"),
  addChapterController
);

router.patch(
    "/update-chapter/:lessonId/:chapterNumber",
    AdminAuthMiddleware,
    roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
    upload.single("chapterContent"),
    updateChapterController
  );
 
  router.delete(
    "/delete-chapter/:lessonId/:chapterNumber",
    AdminAuthMiddleware,
    roleAuthMiddleware(["superadmin", "admin", "contentmanager", "moderator"]),
    deleteChapterController
  );
  
export default router;
