import mongoose, { Document } from "mongoose";

// Define the interface for the grade in a region
export interface RegionGrade {
    gradeName: string;
    gradeId: mongoose.Schema.Types.ObjectId;  // Reference to Grade model
}

// Define the interface for RegionDocument
export interface RegionDocument extends Document {
    _id: mongoose.Schema.Types.ObjectId;
    regionName: string;
    grades: RegionGrade[];
    addAndSortGrades: (gradeName: string, gradeId: mongoose.Schema.Types.ObjectId) => Promise<void>;
    sortGrades: () => void;
}

// Define the Region schema
const regionSchema = new mongoose.Schema<RegionDocument>({
    regionName: { type: String, required: true, unique: true },  // e.g., "Kuwait", "Saudi"
    grades: [
        {
            gradeName: { type: String, required: true },  // e.g., "Grade 1", "Grade 2"
            gradeId: { type: mongoose.Schema.Types.ObjectId, ref: "Grade", required: true }  // Reference to Grade model
        }
    ]
});
// Helper function to extract the numerical part and the alphabetical suffix from gradeName
const parseGradeLevel = (gradeName: string) => {
    const regex = /^Grade\s(\d+)([A-Z]*)$/;  // Matches "Grade 11A", "Grade 11B", etc.
    const match = gradeName.match(regex);
    if (match) {
        const numericPart = parseInt(match[1], 10);  // Extract numeric part (e.g., 11)
        const alphabeticalPart = match[2] || '';  // Extract alphabetical suffix (e.g., "A")
        return { numericPart, alphabeticalPart };
    }
    return { numericPart: 0, alphabeticalPart: '' };  // Default fallback
};

// Helper method to add and sort grades in the region
regionSchema.methods.addAndSortGrades = async function (gradeName: string, gradeId: mongoose.Schema.Types.ObjectId) {
    // Add the new grade to the grades array
    this.grades.push({ gradeName, gradeId });

    // Trigger sorting after adding the grade
    this.sortGrades();
};

// Sort grades function
regionSchema.methods.sortGrades = function () {
    this.grades.sort((a: RegionGrade, b: RegionGrade) => {
        const gradeA = parseGradeLevel(a.gradeName);
        const gradeB = parseGradeLevel(b.gradeName);

        // Compare by numeric part first
        if (gradeA.numericPart !== gradeB.numericPart) {
            return gradeA.numericPart - gradeB.numericPart;
        }

        // If numeric parts are equal, compare by alphabetical part
        return gradeA.alphabeticalPart.localeCompare(gradeB.alphabeticalPart);
    });
};

// Pre-save hook to ensure sorting happens on every save
regionSchema.pre('save', function (next) {
    this.sortGrades();
    next();
});

// Export the Region model
export const Region = mongoose.model<RegionDocument>("Region", regionSchema);
