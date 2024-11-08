import { Subject } from "../models/subject";
import { Unit } from "../models/unit";
import { Response } from "express";
import { CustomRequest } from "../types/customRequest";
import { logAdminAction } from "../utils/logAdminAction";
import { deleteUnit } from "../utils/deleteData";

// Create Unit
export const createUnit = async (req: CustomRequest, res: Response) => {
  if (!req.user?.region || !req.user?.grade) {
    return res.status(400).json({
      message: "Region and Grade must be selected before accessing grades",
    });
  }

  const { subjectId } = req.params;
  const { region, grade } = req.user; // Extract region and grade from user
  const { unitName, unitNo  } = req.body; // Get details from request body

  try {
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

     // Check if unitNo or unitName already exists in this region and subject
     const existingUnit = await Unit.findOne({
      region: region,
      subjectId: subjectId,
      $or: [{ unitNo: unitNo }, { unitName: unitName }],
    });

    if (existingUnit) {
      return res.status(400).json({
        message: "A unit with the same number or name already exists in this subject and region.",
      });
    }

    // Create new unit
    const newUnit = new Unit({
      region: region,
      subjectId: subject._id,
      unitNo: unitNo,
      unitName: unitName,
    });

    // Save the unit
    const savedUnit = await newUnit.save();
    
    // Add the new unit to the subject's unit array
    subject.unit.push({
      unitNo: unitNo,
      unitName: savedUnit.unitName,
      unitObjectId: savedUnit._id,
    });

// Increment the totalUnit field
subject.totalUnit = subject.totalUnit+1;

    // Save the subject, this will trigger the pre-save hook to sort the units
    await subject.save();

    // Log action if needed
    await logAdminAction(
      req,
      "Create Unit",
      true,
      "Unit",
      savedUnit._id.toString(),
      "Unit created"
    );

    res.status(201).json({ message: "Unit created successfully", unit: savedUnit });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(req, "Add Unit", false, "Unit", "", err.message);
      return res
        .status(500)
        .json({ message: "Error adding Unit", error: err.message });
    }
    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Update Unit
export const updateUnit = async (req: CustomRequest, res: Response) => {
  const { subjectId, unitId } = req.params; // Get subjectId and unitId from URL params
  const { unitName, unitNo } = req.body;

  try {
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    // Check if another unit with the same unitNo or unitName already exists in this region and subject
    const existingUnit = await Unit.findOne({
      _id: { $ne: unitId }, // Exclude the current unit being updated
      region: unit.region,
      subjectId: subjectId,
      $or: [{ unitNo: unitNo }, { unitName: unitName }],
    });

    if (existingUnit) {
      return res.status(400).json({
        message: "A unit with the same number or name already exists in this subject and region.",
      });
    }

    // Update unit details
    unit.unitName = unitName;
    unit.unitNo = unitNo;

    // Save updated unit
    const updatedUnit = await unit.save();

    // Find the subject and update the unit's information in the subject's unit array
    const subject = await Subject.findById(subjectId);
    if (subject) {
        const unitInSubject = subject.unit.find(
          (u) => u.unitObjectId.toString() === unitId // Compare as string
        );
  
        if (unitInSubject) {
          unitInSubject.unitName = unitName;
          unitInSubject.unitNo = unitNo;
          await subject.save(); // Will trigger pre-save hook to sort units
        }
      }

    await logAdminAction(
      req,
      "Update Unit",
      true,
      "Unit",
      unitId,
      "Unit updated"
    );

    res
      .status(200)
      .json({ message: "Unit updated successfully", unit: updatedUnit });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(req, "Update Unit", false, "Unit", "", err.message);
      return res
        .status(500)
        .json({ message: "Error Updating Unit", error: err.message });
    }
    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Get Unit by ID
export const getUnitById = async (req: CustomRequest, res: Response) => {
  const { unitId } = req.params;

  try {
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    res.status(200).json({ unit });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(req, "Get a Unit", false, "Unit", "", err.message);
      return res
        .status(500)
        .json({ message: "Error Getting a Unit", error: err.message });
    }
    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Delete Unit
export const deleteUnitController = async (req: CustomRequest, res: Response) => {
  if (!req.user?.region || !req.user?.grade) {
    return res.status(400).json({
      message: "Region and Grade must be selected before accessing grades",
    });
  }

  const { subjectId, unitId } = req.params; // Get unitId from URL params
  const { region, grade } = req.user; // Extract region and grade from user

  try {
    // Find the subject by subjectId
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    // Delete the unit (you might already have logic for this in deleteUnit function)
    await deleteUnit(unitId, region.toString(), grade.toString(), subjectId);

    // Remove the unit reference from the subject's unit array
    subject.unit = subject.unit.filter(
      (unit) => unit.unitObjectId.toString() !== unitId
    );

    // Decrement the totalUnit field
    subject.totalUnit -= 1;

    // Save the subject to apply the changes
    await subject.save();

    // Log action if needed
    await logAdminAction(
      req,
      "Delete Unit",
      true,
      "Unit",
      unitId,
      "Unit deleted"
    );

    res.status(200).json({ message: "Unit deleted successfully" });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(req, "Delete Unit", false, "Unit", "", err.message);
      return res
        .status(500)
        .json({ message: "Error deleting Unit", error: err.message });
    }
    return res.status(500).json({ message: "Unknown error occurred" });
  }
};
