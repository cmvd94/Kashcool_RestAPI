import { Request, Response } from "express";
import { AdminAuditLog } from "../models/adminAuditLog";

// Controller to handle fetching of audit logs with pagination
export const getAuditLogs = async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;  // Default to page 1, 10 logs per page

    try {
        // Parse page and limit from query string to numbers
        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);

        // Fetch logs with pagination and populate admin details
        const logs = await AdminAuditLog.find()
            //.populate('adminId', 'name email')
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);

        // Get total count for pagination info
        const totalLogs = await AdminAuditLog.countDocuments();

        res.status(200).json({
            logs,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalLogs / limitNumber),
            totalLogs,
        });
    } catch (err: unknown) {
        //res.status(500).json({ error: "Failed to fetch audit logs", details: error.message });
        res.status(500).json({ message: "Error fetching admins", error: err instanceof Error ? err.message : "Unknown error" });
    }
};
