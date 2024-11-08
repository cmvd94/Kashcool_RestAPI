import { Request, Response } from "express";
import { Region } from "../models/region";
import { logAdminAction } from "../utils/logAdminAction";
import { CustomRequest } from "../types/customRequest";
import { Grade } from "../models/grade";
import { Subject } from "../models/subject";
import { Unit } from "../models/unit";
import { Lesson } from "../models/lesson";
import  {deleteRegion}  from "../utils/deleteData";

// create new Region
export const createRegion = async (req: Request, res: Response) => {
    const { regionName } = req.body;

    try {
        // Check if the region already exists
        const existingRegion = await Region.findOne({ regionName });
        if (existingRegion) {
            await logAdminAction(req, "Create Region", false, "Admin", null, "Region already exists");
            return res.status(400).json({ message: "Region already exists" });
        }

        // Create a new region
        const newRegion = new Region({
            regionName,
            grades: [] // Initialize with an empty grades array
        });

        await newRegion.save();
        await logAdminAction(req, "Create Region", true, "Admin", newRegion._id.toString());
        res.status(201).json({ message: "Region created successfully", region: newRegion });
    } catch (err: unknown) {
        await logAdminAction(req, "Create Region", false, "Admin", null, err instanceof Error ? err.message : "Unknown error");
        res.status(500).json({ message: "Error creating region", error: err instanceof Error ? err.message : "Unknown error" });
    }
};

// Update a region (for adding/removing grades or other updates)
export const updateRegion = async (req: CustomRequest, res: Response) => {
    console.log("update region name")
    const { id } = req.params;
    const { regionName } = req.body;
    if (!req.user) {
        return res.status(403).json({ message: "Forbidden: No user role found" });
    }
    const adminId = req.user?.id;
    console.log(id)
    try {
        const region = await Region.findById(id);
        if (!region) {
            await logAdminAction(req, "Update Region", false, "Region", adminId.toString(), `Region ${id} not found`);
            return res.status(404).json({ message: "Region not found" });
        }

        // Update region details
        region.regionName = regionName || region.regionName;

        // Log the successful action
        await logAdminAction(req, "Update Region", true, "Region", adminId.toString(), `Region ${region.regionName} updated`);

        // Return the updated region
        await region.save();

        res.status(200).json(region);
    } catch (err: unknown) {
        if (err instanceof Error) {
            await logAdminAction(req, "Update Region", false, "Region", adminId.toString(), err.message);
            res.status(500).json({ message: "Error updating region", error: err.message });
        } else {
            res.status(500).json({ message: "Unknown error occurred" });
        }
    }
};

// Get details of a specific region by ID
export const getRegionById = async (req: Request, res: Response) => {
    console.log("inside getById region")
    const { id } = req.params;

    try {
        // Find the region by its ID
        const region = await Region.findById(id);
        if (!region) {
            await logAdminAction(req, "Get Region By ID", false, "Admin", id, "Region not found");
            return res.status(404).json({ message: "Region not found" });
        }

        await logAdminAction(req, "Get Region By ID", true, "Admin", region._id.toString());
        res.status(200).json(region);
    } catch (err: unknown) {
        await logAdminAction(req, "Get Region By ID", false, "Admin", id, err instanceof Error ? err.message : "Unknown error");
        res.status(500).json({ message: "Error fetching region details", error: err instanceof Error ? err.message : "Unknown error" });
    }
};

// Fetch all regions
export const getAllRegions = async (req: CustomRequest, res: Response) => {
    if (!req.user) {
        return res.status(403).json({ message: "Forbidden: No user role found" });
    }
    const adminId = req.user?.id;

    try {
        const regions = await Region.find();

        // Log the action
        await logAdminAction(req, "Get All Regions", true, "Region", adminId.toString(), "Fetched all regions");

        res.status(200).json(regions);
    } catch (err: unknown) {
        if (err instanceof Error) {
            await logAdminAction(req, "Get All Regions", false, "Region", adminId.toString(), err.message);
            res.status(500).json({ message: "Error fetching regions", error: err.message });
        } else {
            res.status(500).json({ message: "Unknown error occurred" });
        }
    }
};

// Delete a region . inculding all doc 
/* export const deleteRegion = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const region = await Region.findById(id);
        if (!region) {
            return res.status(404).json({ message: "Region not found" });
        }

        // Check if the region has grades
        if (region.grades.length === 0) {
            // If no grades, delete the region directly
            await Region.findByIdAndDelete(id);
            return res.status(200).json({ message: "Region deleted successfully" });
        }

        // Loop through the grades and delete the related subjects, units, and lessons
        for (const gradeEntry of region.grades) {
            const grade = await Grade.findById(gradeEntry.gradeId);
            if (grade) {
                // Delete all subjects associated with this grade
                for (const semester of grade.semesters || []) {
                    for (const subjectEntry of semester.subjects) {
                        const subject = await Subject.findById(subjectEntry.subjectId);
                        if (subject) {
                            // Delete all units associated with this subject
                            for (const unitEntry of subject.unit) {
                                const unit = await Unit.findById(unitEntry.unitObjectId);
                                if (unit) {
                                    // Delete all lessons associated with this unit
                                    for (const lessonEntry of unit.lesson) {
                                        await Lesson.findByIdAndDelete(lessonEntry.lessonId);
                                    }
                                    // Delete the unit after its lessons are deleted
                                    await Unit.findByIdAndDelete(unit._id);
                                }
                            }
                            // Delete the subject after its units are deleted
                            await Subject.findByIdAndDelete(subject._id);
                        }
                    }
                }
                // Delete the grade after its subjects are deleted
                await Grade.findByIdAndDelete(grade._id);
            }
        }

        // Finally, delete the region itself
        await Region.findByIdAndDelete(id);

        res.status(200).json({ message: "Region and related documents deleted successfully" });
    } catch (err) {
        console.error("Error deleting region and related data:", err);
        res.status(500).json({ message: "Error deleting region and related documents" });
    }
};
 */
export const deleteRegionController = async (req: CustomRequest, res: Response) => {
    if (!req.user) {
        return res.status(403).json({ message: "Forbidden: No user role found" });
    }
    const { id } = req.params; // Assume region._id is passed in the URL

    try {
        const region = await Region.findById(id);
        if (!region) {
            await logAdminAction(req, "Get Region By ID", false, "Admin", id, "Region not found");
            return res.status(404).json({ message: "Region not found" });
        }
        // Call the deleteRegion helper function
        await deleteRegion(region._id);

        // Log the successful action
        await logAdminAction(req, "Delete Region", true, "Region", id, "Region deleted successfully");

        // If the operation is successful, return a success response
        return res.status(200).json({
            message: `Region ${region._id} and all associated data deleted successfully.`,
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            // Log the error action
            await logAdminAction(req, "Delete Region", false, "Region", id, err.message);

            // Return an error response
            return res.status(500).json({
                message: `Error deleting region ${id}`,
                error: err.message,
            });
        } else {
            // Handle unknown errors
            await logAdminAction(req, "Delete Region", false, "Region", id, "Unknown error occurred");
            
            return res.status(500).json({
                message: "Unknown error occurred",
            });
        }
    }
};