import mongoose, { Document, Schema } from "mongoose";

// Define the interface for a Chapter object
interface Chapter {
  chapterNumber: string; // Chapter number as a string
  chapterName: string; // Chapter name
  chapterType: "webpage" | "image" | "video"; // Chapter type
  chapterContent: string; // Chapter content (URL or text)
}

// Define the interface for LessonDocument
export interface LessonDocument extends Document {
  _id: mongoose.Schema.Types.ObjectId;
  region: mongoose.Schema.Types.ObjectId;
  unitId: mongoose.Schema.Types.ObjectId;
  lessonNo: Number,
  lessonName: String,
  chapter: Chapter[]; // Array of chapters
}

// Define the Lesson schema
const lessonSchema = new Schema<LessonDocument>(
  {
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    lessonNo: { type: Number, required: true }, // Lesson number
    lessonName: { type: String, required: true }, // Lesson name
    chapter: [
      {
        // Array of chapter objects
        chapterNumber: { type: String, required: true }, // Chapter number as string
        chapterName: { type: String, required: true }, // Chapter name
        chapterType: {
          type: String,
          enum: ["webpage", "image", "video"],
          required: true,
        }, // Chapter type (e.g., video, text, etc.)
        chapterContent: { type: String, required: true }, // Chapter content (could be text or URL to content)
      },
    ],
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Pre-save hook to sort chapters based on chapterNumber
lessonSchema.pre("save", function (next) {
  const lesson = this as LessonDocument;
  
  // Sort the chapter array based on chapterNumber (numeric sorting)
  lesson.chapter.sort((a, b) => {
    const numA = parseFloat(a.chapterNumber);
    const numB = parseFloat(b.chapterNumber);
    return numA - numB;
  });

  next();
});

// Create the Lesson model
export const Lesson = mongoose.model<LessonDocument>("Lesson", lessonSchema);
