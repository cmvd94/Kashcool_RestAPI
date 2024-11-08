import { Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { Subject } from "../models/subject";
import { Grade } from "../models/grade";
import { logAdminAction } from "../utils/logAdminAction";
import { CustomRequest } from "../types/customRequest";
import { multipartUpload } from "../utils/multipartUpload";  // Using the utility for S3 uploads
import { deleteS3Object } from "../utils/deleteS3Object";
import { deleteSubject } from "../utils/deleteData";

// Assuming CustomRequest extends the Request type
export const addSubject = async (req: CustomRequest, res: Response) => {
  const { subjectName, subjectDescription } = req.body;
  // Check if the region and grade are present in the authenticated user data
  if (!req.user?.region || !req.user?.grade) {
    return res.status(400).json({ message: "Region and Grade must be selected before accessing grades" });
  }

  const { region, grade } = req.user;  // Extract region and grade from user
  const semesterName = req.params.semesterName;  // Semester name from params
  
  // Ensure all required fields are present
  if (!subjectName || !subjectDescription || !req.file) {
    return res.status(400).json({ message: "Subject name, description, and image are required" });
  }

  try {
    // Step 1: Find the grade by ID and region
    const gradeDoc = await Grade.findById(grade);
    if (!gradeDoc) {
      return res.status(404).json({ message: "Grade not found" });
    }

    //Check if subject already exists with the same name in the same region and grade
    const existingSubject = await Subject.findOne({
      region,
      gradeId: grade,
      semester: semesterName,
      subjectName
    });

    if (existingSubject) {
      return res.status(400).json({ message: "Subject with this name already exists in the selected region and grade" });
    }
    // Step 2: Create the file path using gradeName, semesterName, and subjectName
    const fileExtension = req.file.mimetype.split("/")[1];
    const gradeName = gradeDoc.grade;  // Assuming the correct field is gradeLevel
    const fileName = `${region}/${gradeName}/${semesterName}/${subjectName}/${req.file.originalname.split('.')[0]}${uuidv4()}.${fileExtension}`;  // Full file path

    // Step 3: Upload the file to S3 using multipartUpload
    await multipartUpload(req.file.buffer, fileName, req.file.mimetype);

    // Step 4: Create the subject and save it to the database
    const subject = new Subject({
      region,
      gradeId: grade,
      semester: semesterName,
      subjectName,
      subjectImage: fileName,  // Use the S3 URL returned from multipartUpload
      subjectDescription,
      lesson: 0,  // Initial lessons set to 0
      totalUnit: 0,
      unit: [],   // Empty units for now
    });

    await subject.save();

    // Step 5: Add the subject to the correct semester in the grade's semesters array
    const semester = gradeDoc.semesters?.find(s => s.semesterName === semesterName);

    if (semester) {
      // If the semester exists, push the subject into the subjects array
      semester.subjects.push({
        subjectId: subject._id,
        subjectName: subjectName,
        image: fileName
      });
    } else {
      // If the semester does not exist, create a new semester and add the subject
      gradeDoc.semesters?.push({
        semesterName: semesterName,
        subjects: [
          {
            subjectId: subject._id,
            subjectName: subjectName,
            image: fileName
          }
        ]
      });
    }

    // Step 6: Save the updated grade document
    await gradeDoc.save();

    // Log the admin action
    await logAdminAction(req, "Add Subject", true, "Subject", subject._id.toString(), `Added subject: ${subjectName}`);

    // Return success response
    res.status(201).json({ message: "Subject created successfully", subject });
  } catch (err: unknown) {
    // Enhanced error handling
    if (err instanceof Error) {
      await logAdminAction(req, "Add Subject", false, "Subject", "", err.message);
      return res.status(500).json({ message: "Error adding subject", error: err.message });
    }
    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Update Subject
export const editSubject = async (req: CustomRequest, res: Response) => {
  const { subjectName, subjectDescription } = req.body;
  
  // Check if the region and grade are present in the authenticated user data
  if (!req.user?.region || !req.user?.grade) {
    return res.status(400).json({ message: "Region and Grade must be selected before accessing grades" });
  }

  const { region, grade } = req.user;  // Extract region and grade from user
  const semesterName = req.params.semesterName;  // Semester name from params
  const subjectId = req.params.subjectId;        // Subject ID from params

  // Ensure required fields are present
  if (!subjectName || !subjectDescription) {
    return res.status(400).json({ message: "Subject name and description are required" });
  }

  try {
    // Step 1: Find the grade by ID and region
    const gradeDoc = await Grade.findById(grade);
    if (!gradeDoc) {
      return res.status(404).json({ message: "Grade not found" });
    }

    // Step 2: Find the subject by ID
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

     // Check if another subject with the same name exists in the same region and grade
     const existingSubject = await Subject.findOne({
      region,
      gradeId: grade,
      semester: semesterName,
      subjectName,
      _id: { $ne: subjectId }
    });

    if (existingSubject) {
      return res.status(400).json({ message: "Another subject with this name already exists in the selected region and grade" });
    }
    // Step 3: Handle image upload if new image is provided
    let fileName = subject.subjectImage; // Default to the existing image URL
    if (req.file) {
      const gradeName = gradeDoc.grade;
      const fileExtension = req.file.mimetype.split("/")[1];
      fileName = `${region}/${gradeName}/${semesterName}/${subjectName}/${req.file.originalname.split('.')[0]}${uuidv4()}.${fileExtension}`

      // Upload new image to S3
      await multipartUpload(req.file.buffer, fileName, req.file.mimetype);

      // Delete old image from S3
      if (subject.subjectImage) {
        await deleteS3Object(subject.subjectImage); // Assuming this deletes based on the S3 path/key
      }
    }

    // Step 4: Update the subject fields
    subject.subjectName = subjectName;
    subject.subjectDescription = subjectDescription;
    subject.subjectImage = fileName;  // Use the new image URL or the old one

    await subject.save();

    // Step 5: Update the grade document for the corresponding semester and subject
    const semester = gradeDoc.semesters?.find(s => s.semesterName === semesterName);

    if (semester) {
      const subjectIndex = semester.subjects.findIndex(s => s.subjectId.toString() === subjectId);

      if (subjectIndex !== -1) {
        // Update subject details in the semester's subjects array
        semester.subjects[subjectIndex] = {
          subjectId: subject._id,
          subjectName: subjectName,
          image: fileName
        };
      }
    }

    await gradeDoc.save();

    // Log the admin action
    await logAdminAction(req, "Edit Subject", true, "Subject", subject._id.toString(), `Edited subject: ${subjectName}`);

    // Return success response
    res.status(200).json({ message: "Subject updated successfully", subject });
  } catch (err: unknown) {
    // Enhanced error handling
    if (err instanceof Error) {
      await logAdminAction(req, "Edit Subject", false, "Subject", "", err.message);
      return res.status(500).json({ message: "Error editing subject", error: err.message });
    }
    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Delete Subject Controller
export const deleteSubjectController = async (req: CustomRequest, res: Response) => {
  const subjectId = req.params.subjectId; // Subject ID from params
  const semesterName = req.params.semesterName; // Semester name from params

  // Check if the region and grade are present in the authenticated user data
  if (!req.user?.region || !req.user?.grade) {
      return res.status(400).json({ message: "Region and Grade must be selected before accessing grades" });
  }

  const { region, grade } = req.user; // Extract region and grade from user

  try {
      // Convert subjectId from string to ObjectId
      //const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      // Call the deleteSubject function with region, grade, and semesterName
      await deleteSubject(subjectId, region.toString(), grade.toString(), semesterName); // Pass ObjectId and additional parameters

      // Log the admin action
      await logAdminAction(req, "Delete Subject", true, "Subject", subjectId, `Deleted subject with ID: ${subjectId}`);

      // Return success response
      res.status(200).json({ message: "Subject deleted successfully" });
  } catch (err: unknown) {
      // Enhanced error handling
      if (err instanceof Error) {
          await logAdminAction(req, "Delete Subject", false, "Subject", subjectId, err.message);
          return res.status(500).json({ message: "Error deleting subject", error: err.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
  }
};