import mongoose, { Document, Schema } from "mongoose";

// Define the interface for a Unit object
interface Unit {
    unitNo: Number;        // Unit number
    unitName: string;      // Unit name
    unitObjectId: mongoose.Schema.Types.ObjectId; // Reference to another Unit document
}

// Define the interface for SubjectDocument
export interface SubjectDocument extends Document {
    _id: mongoose.Schema.Types.ObjectId;
    region: mongoose.Schema.Types.ObjectId;
    gradeId: mongoose.Schema.Types.ObjectId;
    semester: string;               // Semester (e.g., "Semester 1")
    subjectName: string;            // Subject name
    subjectImage: string;           // URL of the subject's image
    subjectDescription: string;     // Description of the subject
    subjectQuiz: mongoose.Schema.Types.ObjectId; // Reference to a Quiz model
    lesson: number;                 // Number of lessons
    totalUnit: number;
    unit: Unit[];                   // Array of units
}

// Define the Subject schema
const subjectSchema = new Schema<SubjectDocument>({
    region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        required : true
      },
      gradeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grade",
        required : true
      },
    semester: { type: String, required: true }, // Semester (e.g., "Semester 1")
    subjectName: { type: String, required: true }, // Subject name
    subjectImage: { type: String, required: true }, // Subject image URL
    subjectDescription: { type: String, required: true }, // Subject description
    //subjectQuiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true }, // Reference to a Quiz model
    subjectQuiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz'}, // Reference to a Quiz model
    lesson: { type: Number, required: true }, // Number of lessons
    totalUnit: { type: Number},
    unit: [{                                   // Array of unit objects
        unitNo: { type: Number, required: true }, // Unit number
        unitName: { type: String, required: true }, // Unit name
        unitObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true } // Reference to a Unit model
    }]
}, {
    timestamps: true // Automatically manage createdAt and updatedAt fields
});

// Pre-save hook to sort units by `unitNo`
subjectSchema.pre("save", function (next) {
    this.unit.sort((a, b) => +a.unitNo - +b.unitNo); // Sort by unitNo in ascending order
    next();
  });

// Create the Subject model
export const Subject = mongoose.model<SubjectDocument>("Subject", subjectSchema);
