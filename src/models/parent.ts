import mongoose, { Schema, Document, Model, CallbackError } from "mongoose";
import bcrypt from "bcryptjs";

// Interface for Parent Document
export interface ParentDocument extends Document {
  _id: mongoose.Schema.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  gender: string; // Gender of the parent
  region: mongoose.Schema.Types.ObjectId; // Reference to the region
  dateOfBirth: Date; // Date of birth
  defaultChild: mongoose.Schema.Types.ObjectId | null; // Default child selected by the parent
  children: mongoose.Schema.Types.ObjectId[]; // List of children (references)
  loginAttempts: number; // Count of failed login attempts
  lockUntil: Date | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Schema for Parent
const ParentSchema: Schema<ParentDocument> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"], // Enum for gender selection
      required: true,
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region", // Assuming there is a Region model
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    defaultChild: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      default: null, // Can be null if no default child is selected
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Child",
      },
    ],

    loginAttempts: { type: Number, default: 0 }, // Count of failed login attempts
    lockUntil: { type: Date, default: null }, // Lockout expiry time
  },
  { timestamps: true }
);

/**
 * Password hash middleware for Parent schema.
 */
ParentSchema.pre(
  "save",
  async function save(next: (err?: CallbackError) => void) {
    const parent = this as ParentDocument;

    // Only hash the password if it has been modified (or is new)
    if (!parent.isModified("password")) {
      return next();
    }

    try {
      // Generate salt and hash the password
      const salt = await bcrypt.genSalt(10);
      parent.password = await bcrypt.hash(parent.password, salt);
      return next();
    } catch (err) {
      return next(err as CallbackError); // Handle error
    }
  }
);

/**
 * Method to compare passwords for authentication.
 */
ParentSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
// Parent Model
const Parent: Model<ParentDocument> = mongoose.model<ParentDocument>(
  "Parent",
  ParentSchema
);

export default Parent;

/* 
// Method to get Gravatar URL
parentSchema.methods.gravatar = function (size: number = 200) {
    if (!this.email) {
        return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};
 */
