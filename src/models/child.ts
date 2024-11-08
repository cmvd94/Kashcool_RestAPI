import mongoose, { Document, Schema } from "mongoose";

// Define the Subscription interface
interface Subscription {
  region: mongoose.Types.ObjectId; // Reference to Region
  grade: mongoose.Types.ObjectId; // Reference to Grade
  semester: string; // Semester information
}

// Define the Child interface
export interface ChildDocument extends Document {
  parent: mongoose.Types.ObjectId; // Reference to Parent
  name: string; // Child's name
  gender: string; // Child's gender
  schoolName: string; // Child's school name
  dateOfBirth: Date; // Child's date of birth
  childrenImage: string; // URL or path to child's image
  subscriptions: Subscription[]; // Array of subscription objects
}

// Define the Child schema
const ChildSchema: Schema = new Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parent",
    required: true,
  },
  name: { type: String, required: true },
  gender: {
    type: String,
    enum: ["male", "female", "other"], // Enum for gender selection
    required: true,
  },
  schoolName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  childrenImage: { type: String, default: null }, // Optional child image field
  subscriptions: [
    {
      region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        required: true,
      },
      grade: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grade",
        required: true,
      },
      semester: { type: String, required: true },
    },
  ],
});

// Export the model
export const Child = mongoose.model<ChildDocument>("Child", ChildSchema);
