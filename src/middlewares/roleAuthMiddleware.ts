import { Response, NextFunction } from "express";
import { CustomRequest } from "../types/customRequest"; // Assuming you've extended the Request type

const roleAuthMiddleware = (allowedRoles: string[]) => {
    console.log("inside RoleAuthMiddleware")
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: "Forbidden: No user role found" });
        }
        
        const { role } = req.user; // Assuming `role` is added by superAuthMiddleware

        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ message: "Forbidden: You don't have permission" });
        }
        next();
    };
};

export default roleAuthMiddleware;
