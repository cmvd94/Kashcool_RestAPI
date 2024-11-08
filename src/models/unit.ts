import mongoose, { Document, Schema } from "mongoose";

// Define the interface for a Lesson object
interface Lesson {
  lessonNo: Number; // Lesson number (as a string)
  lessonName: String; // Lesson name
  lessonId: mongoose.Schema.Types.ObjectId; // Reference to a Lesson document
}

// Define the interface for UnitDocument
export interface UnitDocument extends Document {
  _id: mongoose.Schema.Types.ObjectId;
  region: mongoose.Schema.Types.ObjectId;
  subjectId: mongoose.Schema.Types.ObjectId;
  unitNo: Number;
  unitName: string; // Unit name
  lesson: Lesson[]; // Array of lessons
}


// Define the Unit schema
const unitSchema = new Schema<UnitDocument>(
  {
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    unitNo: { type: Number, required: true }, // Unit name
    unitName: { type: String, required: true }, // Unit name
    lesson: [
      {
        // Array of lesson objects
        lessonNo: { type: Number, required: true }, // Lesson number as string
        lessonName: { type: String, required: true }, // Lesson name
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lesson",
          required: true,
        }, // Reference to a Lesson model
      },
    ],
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Pre hook Lesson sorting based on LessonNo
unitSchema.pre("save", function (next) {
  this.lesson.sort((a, b) => +a.lessonNo - +b.lessonNo); // Sort lessons by lessonNo
  next();
});


// Compound index for region, subjectId, unitNo, and unitName
unitSchema.index(
  { region: 1, subjectId: 1, unitNo: 1, unitName: 1 },
  { unique: true }
);

// Create the Unit model
export const Unit = mongoose.model<UnitDocument>("Unit", unitSchema);
