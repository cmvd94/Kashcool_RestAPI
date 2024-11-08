import { Admin } from "../models/admin";
import dotenv from "dotenv";

dotenv.config();

export const setupSuperAdmin = async () => {
    try {
        const superAdminExists = await Admin.findOne({ role: "superadmin" });
        if (superAdminExists) {
            console.log("Super admin already exists.");
            return;
        }

        const superAdmin = new Admin({
            name: "Super Admin", // Provide a name
            email: process.env.SUPER_ADMIN_EMAIL,
            password: process.env.SUPER_ADMIN_PASSWORD, // You should hash this password
            role: "superadmin", // Make sure this role is in the validRoles array
        });

        await superAdmin.save();
        console.log("Super admin created successfully.");
    } catch (error) {
        console.error("Error setting up super admin:", error);
    }
};


