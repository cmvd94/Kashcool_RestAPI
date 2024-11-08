import { Response } from "express";
import mongoose from "mongoose";

import { Region } from "../models/region";
import { Grade } from "../models/grade";
import { deleteSubject } from "../utils/deleteData";
import { logAdminAction } from "../utils/logAdminAction";
import { CustomRequest } from "../types/customRequest";
import { deleteGrade } from "../utils/deleteData";

// Add a grade to a region and sort the grades
export const addGradeToRegion = async (req: CustomRequest, res: Response) => {
    const regionId = req.user?.region; // Region ID is taken from the logged-in user's session
    //console.log(`region ${regionId}`);
    // Check if the region is selected
    if (!req.user?.region) {
        return res.status(400).json({ message: "Region must be selected before accessing grades" });
    }
    const { gradeName } = req.body; // Expecting the gradeName from the request body

    if (!req.user) {
        return res.status(403).json({ message: "Forbidden: No user role found" });
    }

    const adminId = req.user?.id; // Assuming `req.user` contains the logged-in admin ID

    if (!gradeName) {
        return res.status(400).json({ message: "Grade name is required" });
    }

    try {
        // Find the region by ID
        const region = await Region.findById(regionId);

        if (!region) {
            await logAdminAction(req, "Add Grade to Region", false, "Region", adminId.toString(), `Region ${regionId} not found`);
            return res.status(404).json({ message: "Region not found" });
        }


        // Check if the grade with the same name already exists in the region
        const existingGrade = await Grade.findOne({ grade: gradeName, region: regionId });
        if (existingGrade) {
            return res.status(400).json({ message: `Grade "${gradeName}" already exists in this region` });
        }
        
        // Create a new grade using the Grade model with the grade name and region
        const newGrade = new Grade({
            grade: gradeName,
            region: regionId  // Set the region for the grade
        });

        // Save the new grade
        await newGrade.save();

        // Push new Grade in array
        await region.addAndSortGrades(gradeName, newGrade._id);  // Assuming addAndSortGrades will take care of grade sorting
        // saved and sorted
        await region.save()
        // Log the successful action
        await logAdminAction(req, "Add Grade to Region", true, "Region", adminId.toString(), `Grade ${gradeName} added to region ${region.regionName}`);

        // Return the updated region with the newly added grade
        res.status(200).json(region);
    } catch (err: unknown) {
        if (err instanceof Error) {
            await logAdminAction(req, "Add Grade to Region", false, "Region", adminId.toString(), err.message);
            res.status(500).json({ message: "Error adding grade to region", error: err.message });
        } else {
            res.status(500).json({ message: "Unknown error occurred" });
        }
    }
};

// Get a gradebyId
export const getGrade = async (req: CustomRequest, res: Response) => {
    const { id } = req.params; // Assuming the grade ID is passed in the URL
    // Check if the region is selected
    if (!req.user?.region) {
        return res.status(400).json({ message: "Region must be selected before accessing grades" });
    }
    try {
        // Find the grade by ID
        const grade = await Grade.findById({region: req.user?.region ,_id: id});

        if (!grade) {
            await logAdminAction(req, "Get Grade", false, "Grade", id, "Grade not found");
            return res.status(404).json({ message: "Grade not found" });
        }

        await logAdminAction(req, "Get Grade", true, "Grade", id);
        return res.status(200).json(grade);
    } catch (err: unknown) {
        if (err instanceof Error) {
            await logAdminAction(req, "Get Grade", false, "Grade", id, err.message);
            return res.status(500).json({ message: "Error fetching grade", error: err.message });
        } else {
            return res.status(500).json({ message: "Unknown error occurred" });
        }
    }
};

// Get all Grade
export const getAllGrades = async (req: CustomRequest, res: Response) => {
    // Check if the region is selected
    if (!req.user?.region) {
        return res.status(400).json({ message: "Region must be selected before accessing grades" });
    }
    if (!req.user) {
        return res.status(403).json({ message: "Forbidden: No user role found" });
      }
    try {
        // Fetch all grades from the database
        const grades = await Grade.find({region: req.user.region});

        await logAdminAction(req, "Get All Grades", true, "Grade", null);

        return res.status(200).json(grades);
    } catch (err: unknown) {
        if (err instanceof Error) {
            await logAdminAction(req, "Get All Grades", false, "Grade", null, err.message);
            return res.status(500).json({ message: "Error fetching grades", error: err.message });
        } else {
            return res.status(500).json({ message: "Unknown error occurred" });
        }
    }
};

// Controller for updating the grade name and reflecting the change in the region model
// Update grade name function
export const updateGradeName = async (req: CustomRequest, res: Response) => {
    const { id } = req.params; // Grade ID from request parameters
    const { newGradeName } = req.body; // New grade name from request body
    // Check if the region is selected
    if (!req.user?.region) {
        return res.status(400).json({ message: "Region must be selected before accessing grades" });
    }
    try {
        // Check if the new grade name already exists in the Region
         const region = await Region.findOne({ _id: req.user?.region });
        const gradeExists = region?.grades.some(g => g.gradeName === newGradeName);

        if (gradeExists) {
            return res.status(400).json({ message: "A grade with the same name already exists in this region" });
        }
  
        // Find and update the grade by ID
        const updatedGrade = await Grade.findOneAndUpdate(
            { region: req.user?.region, _id: id },
            { grade: newGradeName },
            { new: true } // Return the updated document
        );

        if (!updatedGrade) {
            return res.status(404).json({ message: "Grade not found" });
        }

        // Find the region that contains the grade and update the grade name in the Region model
        const updatedRegion = await Region.findOneAndUpdate(
            { _id: req.user?.region, "grades.id": id }, // Find the region by its ID and grade by grade ID
            { $set: { "grades.$.gradeName": newGradeName } }, // Update the grade name inside the grades array
            { new: true } // Return the updated document
        );

        if (!updatedRegion) {
            return res.status(404).json({ message: "Region not found for the grade" });
        }

        // Sort the grades within the region after the update
        await updatedRegion.sortGrades(); // Trigger the sorting
        await updatedRegion.save(); // Save the region after sorting

        // Log the admin action
        await logAdminAction(req, "Update Grade Name", true, "Grade", id);

        // Respond with the updated grade
        res.status(200).json({ message: "Grade name updated successfully", updatedGrade });
    } catch (err: unknown) {
        if (err instanceof Error) {
            await logAdminAction(req, "Update Grade Name", false, "Grade", id, err.message);
            res.status(500).json({ message: "Error updating grade name", error: err.message });
        } else {
            res.status(500).json({ message: "Unknown error occurred" });
        }
    }
};

// Delete Grade Controller
export const deleteGradeController = async (req: CustomRequest, res: Response) => {
    const gradeId = req.params.gradeId; // Grade ID from params
    const region = req.user?.region; // Extract region from user

    try {
        if (!region) {
            return res.status(400).json({ message: "Region must be provided" });
        }

        // Convert gradeId from string to ObjectId
        //const gradeObjectId = new mongoose.Schema.Types.ObjectId(gradeId);

        // Call the deleteGrade function
        await deleteGrade(gradeId, region.toString()); // Pass ObjectId and region

        // Log the admin action
        await logAdminAction(req, "Delete Grade", true, "Grade", gradeId, `Deleted grade with ID: ${gradeId}`);

        // Return success response
        res.status(200).json({ message: "Grade deleted successfully" });
    } catch (err: unknown) {
        // Enhanced error handling
        if (err instanceof Error) {
            await logAdminAction(req, "Delete Grade", false, "Grade", gradeId, err.message);
            return res.status(500).json({ message: "Error deleting grade", error: err.message });
        }
        return res.status(500).json({ message: "Unknown error occurred" });
    }
};

// Controller to either add a new semester or update an existing semester name
export const addOrUpdateSemester = async (req: CustomRequest, res: Response) => {
    const { id } = req.params;  // The ID of the grade from request parameters
    const { oldSemesterName, newSemesterName } = req.body;  // Old and new semester names from the request body
    // Check if the region and grade is selected
    if (!req.user?.region || !req.user?.grade) {
        return res.status(400).json({ message: "Region and Grade must be selected before accessing grades" });
    }

    try {
        // Step 1: Find the grade by its ID
        const grade = await Grade.findById({region: req.user?.region ,_id: id});
        if (!grade) {
            return res.status(404).json({ message: "Grade not found" });
        }
        // Ensure semesters is an array, or set it to an empty array if it's undefined
        if (!grade.semesters) {
            grade.semesters = [];
        }

        // Step 2: If `oldSemesterName` is provided, handle updating an existing semester
        if (oldSemesterName) {
            const semester = grade.semesters.find(sem => sem.semesterName === oldSemesterName);
            if (!semester) {
                return res.status(404).json({ message: "Semester not found" });
            }

            // Check if the new semester name already exists
            const semesterExists = grade.semesters.some(sem => sem.semesterName === newSemesterName);
            if (semesterExists) {
                return res.status(400).json({ message: "Semester with this name already exists." });
            }

            // Update the semester name
            semester.semesterName = newSemesterName;

            // Save the updated grade document (sorting will happen via pre-save hook)
            await grade.save();

            // Log the successful update
            await logAdminAction(req, "Update Semester", true, "Grade", id, "");

            return res.status(200).json({ message: "Semester name updated successfully", grade });
        }

        // Step 3: If no `oldSemesterName`, handle adding a new semester
        const existingSemester = grade.semesters.find(sem => sem.semesterName === newSemesterName);
        if (existingSemester) {
            return res.status(400).json({ message: "Semester with this name already exists." });
        }

        // Add the new semester to the grade's semester array
        grade.semesters.push({
            semesterName: newSemesterName,
            subjects: []  // Initialize with an empty array of subjects
        });

        // Save the updated grade document (sorting will happen via pre-save hook)
        await grade.save();

        // Log the successful addition
        await logAdminAction(req, "Add Semester", true, "Grade", id, "");

        return res.status(201).json({ message: "Semester added successfully", grade });
    } catch (err: unknown) {
        // Handle any errors that occur
        if (err instanceof Error) {
            // Log the error action
            await logAdminAction(req, "Add/Update Semester", false, "Grade", id, err.message);

            // Return error response
            return res.status(500).json({ message: "Failed to process request", error: err.message });
        } else {
            return res.status(500).json({ message: "Unknown error occurred" });
        }
    }
};
// Controller to delete a semester by name
export const deleteSemester = async (req: CustomRequest, res: Response) => {
    const { id, semesterName } = req.params;  // Grade ID and semester name from request parameters
    const { region, grade } = req.user || {};  // Extract region and grade from the authenticated user

    if (!region || !grade) {
        return res.status(400).json({ message: "Region and Grade must be selected before accessing grades" });
    }

    let session: mongoose.ClientSession | null = null;
    
    try {
        // Start a session and transaction
        session = await mongoose.startSession();
        session.startTransaction();

        // Step 1: Find the grade by its ID and region
        const gradeDoc = await Grade.findOne({ region, _id: id }).session(session);
        if (!gradeDoc) {
            return res.status(404).json({ message: "Grade not found" });
        }

        // Step 2: Check if semesters exist and find the semester by its name
        const semesters = gradeDoc.semesters || [];  // Provide a fallback empty array
        const semesterIndex = semesters.findIndex(sem => sem.semesterName === semesterName);
        if (semesterIndex === -1) {
            return res.status(404).json({ message: "Semester not found" });
        }

        // Step 3: Delete all subjects related to this semester
        const subjectsToDelete = semesters[semesterIndex]?.subjects || [];
        for (const subject of subjectsToDelete) {
            await deleteSubject(
                subject.subjectId.toString(),
                region.toString(),
                id.toString(),
                semesterName,
                session  // Pass the session for transactional safety
            );
        }

        // Step 4: Remove the semester from the grade
        semesters.splice(semesterIndex, 1);
        gradeDoc.semesters = semesters;  // Ensure we update the semesters field with the modified array
        await gradeDoc.save({ session });

        // Step 5: Commit the transaction
        await session.commitTransaction();

        // Step 6: Log the successful deletion
        await logAdminAction(req, "Delete Semester", true, "Grade", id, `Deleted ${semesterName} and related subjects`);

        // Step 7: Return success response
        res.status(200).json({
            message: `Semester ${semesterName} and its related subjects were deleted successfully`,
            grade: gradeDoc
        });

    } catch (err: unknown) {
        // Abort the transaction if an error occurs
        if (session) {
            await session.abortTransaction();
        }

        // Handle errors
        if (err instanceof Error) {
            await logAdminAction(req, "Delete Semester", false, "Grade", id, err.message);
            res.status(500).json({ message: "Error deleting semester", error: err.message });
        } else {
            res.status(500).json({ message: "Unknown error occurred" });
        }
    } finally {
        // End the session
        if (session) {
            session.endSession();
        }
    }
};
