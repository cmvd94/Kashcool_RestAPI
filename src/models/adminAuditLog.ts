import mongoose, { Document, Schema } from "mongoose";

// Define the interface for AdminAuditLog
export interface AdminAuditLogDocument extends Document {
    adminId: mongoose.Schema.Types.ObjectId; // Reference to the Admin performing the action
    adminName: string;
    action: string; // The action that was performed (e.g., "Create Admin", "Login", etc.)
    success: boolean; // Whether the action was successful or not
    targetModel: string; // The model the action was performed on (e.g., "Admin", "User", etc.)
    targetId: mongoose.Schema.Types.ObjectId | null; // The specific document that was affected by the action (or null)
    errorMessage?: string; // Any error message, in case the action failed
    timestamp: Date; // When the action was performed
    ipAddress: string; // IP address of the request
}

// Define the AdminAuditLog schema
const adminAuditLogSchema = new Schema<AdminAuditLogDocument>({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }, // Admin who performed the action
    adminName: { type: String, required: true }, // What action was performed
    action: { type: String, required: true }, // What action was performed
    success: { type: Boolean, required: true }, // Whether the action succeeded
    targetModel: { type: String, required: true }, // Target model affected
    targetId: { type: mongoose.Schema.Types.ObjectId, required: false, default: null }, // Target document affected (if any)
    errorMessage: { type: String, required: false }, // Error message if the action failed
    timestamp: { type: Date, default: Date.now, required: true }, // Timestamp of the action
    ipAddress: { type: String, required: true }, // IP address from where the action was performed
});

// Create the model from the schema
export const AdminAuditLog = mongoose.model<AdminAuditLogDocument>("AdminAuditLog", adminAuditLogSchema);

