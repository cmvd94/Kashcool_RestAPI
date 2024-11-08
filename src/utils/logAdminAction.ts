// utils/logAdminAction.ts

import { AdminAuditLog } from "../models/adminAuditLog";
import { CustomRequest } from "../types/customRequest";

// Helper function to log admin actions
export const logAdminAction = async (
  req: CustomRequest,
  action: string,
  success: boolean,
  targetModel: string,
  targetId: string | null,
  errorMessage: string = ""
) => {
  const adminId = req.user?.id;
  const adminName = req.user?.name;
  await AdminAuditLog.create({
    adminId,
    adminName,
    action,
    success,
    targetModel,
    targetId,
    errorMessage,
    timestamp: new Date(),
    ipAddress: req.ip,
  });
};
