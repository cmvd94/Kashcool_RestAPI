import mongoose, { Document, Schema, CallbackError, ObjectId } from "mongoose";
import bcrypt from "bcryptjs";

// Define the interface for Admin Document
export interface AdminDocument extends Document {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  role: string;
  region?: ObjectId | null; // Add region field to store the selected region
  grade?: ObjectId | null
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

// Define the valid roles
const validRoles = [
  "superadmin",
  "admin",
  "contentmanager",
  "moderator",
  "support",
] as const;

// Define the Admin schema
const adminSchema = new Schema<AdminDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: validRoles,
      required: true,
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
      default: null,
    }, // Initialize with null
    grade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Password hash middleware for Admin schema.
 */
adminSchema.pre(
  "save",
  async function save(next: (err?: CallbackError) => void) {
    const admin = this as AdminDocument;
    if (!admin.isModified("password")) {
      return next();
    }

    try {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(admin.password, salt);
      return next();
    } catch (err) {
      return next(err as CallbackError); // Cast 'err' to 'CallbackError'
    }
  }
);

/**
 * Method to compare passwords for authentication.
 */
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create and export the Admin model
export const Admin = mongoose.model<AdminDocument>("Admin", adminSchema);
