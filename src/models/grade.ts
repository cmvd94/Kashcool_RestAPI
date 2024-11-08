import mongoose, { Document } from "mongoose";

// Define the interface for Subject within each semester
interface Subject {
    subjectId: mongoose.Schema.Types.ObjectId;
    subjectName: string;
    image: string;
}

// Define the interface for Semester
interface Semester {
    semesterName: string;  // e.g., 'Semester 1', 'Semester 2', etc.
    subjects: Subject[];   // Array of subjects for each semester
}


// Define the interface for GradeDocument
export interface GradeDocument extends Document {
    _id: mongoose.Schema.Types.ObjectId;
    grade: string;
    region: mongoose.Schema.Types.ObjectId;        // Region identifier (e.g., 'kuwait', 'saudi')
    semesters?: Semester[]; // Array of dynamic semesters
}

// Define the Grade schema
const gradeSchema = new mongoose.Schema<GradeDocument>({
    grade: { type: String, required: true },
    region:  {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        required : true
      },  // Region-specific field
    semesters: [
        {
            semesterName: { type: String, required: true }, // Dynamically added semester name
            subjects: [
                {
                    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
                    subjectName: { type: String, required: true },
                    image: { type: String, required: true }
                }
            ]
        }
    ]
});

// Set a default empty array for semesters in the schema
gradeSchema.path('semesters').default(() => []);

// Helper function to extract the numeric part of the semester name
function extractSemesterNumber(semesterName: string): number {
    const match = semesterName.match(/\d+/);  // Extract the first number found in the string
    return match ? parseInt(match[0], 10) : 0;  // Return the number or 0 if no number found
}

// Pre-save hook to sort the semesters by their numeric part
gradeSchema.pre('save', function (next) {
    if (this.semesters && this.semesters.length > 0) {
        this.semesters.sort((a, b) => {
            const numA = extractSemesterNumber(a.semesterName);
            const numB = extractSemesterNumber(b.semesterName);
            return numA - numB;  // Sort based on the extracted numbers
        });
    }
    next();
})

// Define the Grade model
export const Grade = mongoose.model<GradeDocument>("Grade", gradeSchema);
