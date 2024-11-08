import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { Lesson } from "../models/lesson";
import { Unit } from "../models/unit";
import { Subject } from "../models/subject";
import { logAdminAction } from "../utils/logAdminAction";
import { CustomRequest } from "../types/customRequest";
import { deleteLesson } from "../utils/deleteData";
import { multipartUpload } from "../utils/multipartUpload";
import { deleteChapter } from "../utils/deleteData";

// Create Lesson
export const createLesson = async (req: CustomRequest, res: Response) => {
  if (!req.user?.region) {
    return res.status(400).json({
      message: "Region must be selected before adding lessons",
    });
  }

  const { unitId } = req.params; // Get unitId from request parameters
  const { region } = req.user; // Extract region from user
  const { lessonName, lessonNo } = req.body; // Get lesson details from request body

  try {
    // Find the associated unit
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    // Check for existing lesson with the same lessonNo or lessonName
    const existingLesson = unit.lesson.find(
      (l) => l.lessonNo === lessonNo || l.lessonName === lessonName
    );

    if (existingLesson) {
      return res.status(400).json({
        message:
          "Lesson with the same name or number already exists in this unit.",
      });
    }
    // Create new lesson
    const newLesson = new Lesson({
      region: region,
      unitId: unit._id,
      lessonNo: lessonNo,
      lessonName: lessonName,
      chapter: [],
    });

    // Save the new lesson
    const savedLesson = await newLesson.save();

    // Add the new lesson to the unit's lesson array
    unit.lesson.push({
      lessonNo,
      lessonName: savedLesson.lessonName,
      lessonId: savedLesson._id,
    });

    // Save the unit, this will trigger the pre-save hook to sort lessons
    await unit.save();

    // Now, increment the lesson count in the associated subject
    const subject = await Subject.findById(unit.subjectId);
    if (subject) {
      subject.lesson += 1; // Increment the lesson count
      await subject.save(); // Save the updated subject
    }

    // Log admin action if needed
    await logAdminAction(
      req,
      "Create Lesson",
      true,
      "Lesson",
      savedLesson._id.toString(),
      "Lesson created successfully"
    );

    // Respond with the saved lesson
    res
      .status(201)
      .json({ message: "Lesson created successfully", lesson: savedLesson });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(
        req,
        "Create Lesson",
        false,
        "Lesson",
        "",
        err.message
      );
      return res
        .status(500)
        .json({ message: "Error creating Lesson", error: err.message });
    }
    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Update Lesson
export const updateLesson = async (req: CustomRequest, res: Response) => {
  if (!req.user?.region) {
    return res.status(400).json({
      message: "Region must be selected before updating lessons",
    });
  }

  const { unitId, lessonId } = req.params;
  const { region } = req.user;
  const { lessonName, lessonNo } = req.body;

  try {
    // Find the associated lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    // Find the associated unit
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    // Check for existing lesson with the same lessonNo or lessonName
    const existingLesson = unit.lesson.find(
      (l) =>
        (l.lessonNo === lessonNo || l.lessonName === lessonName) &&
        l.lessonId.toString() !== lessonId // Exclude the current lesson being updated
    );

    if (existingLesson) {
      return res.status(400).json({
        message:
          "Another lesson with the same name or number already exists in this unit.",
      });
    }

    // Update lesson details
    lesson.lessonNo = lessonNo;
    lesson.lessonName = lessonName;

    const updatedLesson = await lesson.save();

    // Update lesson in unit's array
    const lessonIndex = unit.lesson.findIndex(
      (l) => l.lessonId.toString() === lessonId
    );
    if (lessonIndex !== -1) {
      unit.lesson[lessonIndex].lessonNo = lessonNo;
      unit.lesson[lessonIndex].lessonName = lessonName;
    }

    await unit.save();

    await logAdminAction(
      req,
      "Update Lesson",
      true,
      "Lesson",
      lessonId,
      "Lesson updated successfully"
    );

    res
      .status(200)
      .json({ message: "Lesson updated successfully", lesson: updatedLesson });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(
        req,
        "Update Lesson",
        false,
        "Lesson",
        "",
        err.message
      );
      return res
        .status(500)
        .json({ message: "Error updating Lesson", error: err.message });
    }
    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Delete Lesson
export const deleteLessonController = async (
  req: CustomRequest,
  res: Response
) => {
  if (!req.user?.region) {
    return res.status(400).json({
      message: "Region must be selected before deleting lessons",
    });
  }

  const { unitId, lessonId } = req.params; // Get unitId and lessonId from request parameters
  const { region } = req.user; // Extract region from user

  try {
    // Call the deleteLesson function to handle lesson deletion and updates
    await deleteLesson(lessonId, unitId, region.toString(), "");

    // Find the associated unit to check if the lesson was successfully removed
    const unit = await Unit.findById(unitId);
    if (!unit) {
      throw new Error("Unit not found");
    }

    // Find the associated subject to decrement the lesson count
    const subject = await Subject.findById(unit.subjectId);
    if (subject) {
      subject.lesson -= 1; // Decrement the lesson count
      await subject.save(); // Save the updated subject
    }

    // Log admin action
    await logAdminAction(
      req,
      "Delete Lesson",
      true,
      "Lesson",
      lessonId,
      "Lesson deleted successfully"
    );

    // Send a success response
    res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (err: unknown) {
    if (err instanceof Error) {
      await logAdminAction(
        req,
        "Delete Lesson",
        false,
        "Lesson",
        "",
        err.message
      );
      return res
        .status(500)
        .json({ message: "Error deleting lesson", error: err.message });
    }

    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Add Chapter
export const addChapterController = async (
  req: CustomRequest,
  res: Response
) => {
  const { lessonId } = req.params; // Get the lesson ID from the URL parameters
  const { chapterNumber, chapterName, chapterType, chapterContent } = req.body; // Extract the chapter details from the request body

  if (!chapterNumber || !chapterName || !chapterType) {
    return res
      .status(400)
      .json({ message: "Chapter number, name, and type are required" });
  }

  try {
    // Step 1: Find the lesson by ID
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    // Check if chapter already exists by chapter number or name
    const existingChapter = lesson.chapter.find(
      (ch) =>
        ch.chapterNumber === chapterNumber || ch.chapterName === chapterName
    );

    if (existingChapter) {
      return res.status(400).json({
        message:
          "Chapter with the same number or name already exists in this lesson.",
      });
    }

    let contentUrl = chapterContent; // By default, assume the chapter content is the provided URL (for "webpage" type)

    // Step 2: If chapter type is image or video, upload to S3
    if (chapterType === "image" || chapterType === "video") {
      if (!req.file) {
        return res
          .status(400)
          .json({
            message: "File is required for image or video chapter types",
          });
      }

      const fileExtension = req.file.mimetype.split("/")[1];
      const fileName = `lessons/${lessonId}/chapters/${chapterNumber}/${uuidv4()}.${fileExtension}`; // Create a unique file name

      // Upload the file to S3 using the multipartUpload utility
      await multipartUpload(req.file.buffer, fileName, req.file.mimetype);

      // Set the contentUrl to the S3 file path
      contentUrl = fileName;
    }

    // Step 3: Create the new chapter object
    const newChapter = {
      chapterNumber,
      chapterName,
      chapterType,
      chapterContent: contentUrl, // Use the S3 URL or direct content
    };

    // Step 4: Add the new chapter to the lesson
    lesson.chapter.push(newChapter);
    await lesson.save();

    // Step 5: Log the admin action
    await logAdminAction(
      req,
      "Add Chapter",
      true,
      "Lesson",
      lessonId,
      `Chapter ${chapterName} added to lesson`
    );

    // Step 6: Return success response
    return res
      .status(201)
      .json({ message: "Chapter added successfully", chapter: newChapter });
  } catch (err: unknown) {
    if (err instanceof Error) {
      // Log the failure
      await logAdminAction(
        req,
        "Add Chapter",
        false,
        "Lesson",
        lessonId,
        err.message
      );
      return res
        .status(500)
        .json({ message: "Error adding chapter", error: err.message });
    }

    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Update Chapter
export const updateChapterController = async (
  req: CustomRequest,
  res: Response
) => {
  const { lessonId, chapterNumber } = req.params; // Get lesson ID and chapter number from the URL
  const { chapterName, chapterType, chapterContent } = req.body; // Extract chapter details from the request body

  try {
    // Step 1: Find the lesson by ID
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Step 2: Find the specific chapter by its number
    const chapterIndex = lesson.chapter.findIndex(
      (chapter) => chapter.chapterNumber === chapterNumber
    );
    if (chapterIndex === -1) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    //Check if chapterNumber or chapterName already exists (excluding the current chapter)
    const chapterNumberExists = lesson.chapter.some(
      (chapter, index) =>
        chapter.chapterNumber === chapterNumber && index !== chapterIndex
    );
    const chapterNameExists =
      chapterName &&
      lesson.chapter.some(
        (chapter, index) =>
          chapter.chapterName === chapterName && index !== chapterIndex
      );

    if (chapterNumberExists) {
      return res.status(400).json({ message: "Chapter number already exists" });
    }

    if (chapterNameExists) {
      return res.status(400).json({ message: "Chapter name already exists" });
    }

    let updatedContent =
      chapterContent || lesson.chapter[chapterIndex].chapterContent; // Default to existing content

    // Step 3: Handle file upload for image/video if the chapterType is updated
    if ((chapterType === "image" || chapterType === "video") && req.file) {
      const fileExtension = req.file.mimetype.split("/")[1];
      const fileName = `lessons/${lessonId}/chapters/${chapterNumber}/${uuidv4()}.${fileExtension}`; // Unique file name

      // Upload the new file to S3 using the multipartUpload utility
      await multipartUpload(req.file.buffer, fileName, req.file.mimetype);

      // Update the content to the new S3 file path
      updatedContent = fileName;
    }

    // Step 4: Update the chapter details
    lesson.chapter[chapterIndex].chapterName =
      chapterName || lesson.chapter[chapterIndex].chapterName;
    lesson.chapter[chapterIndex].chapterType =
      chapterType || lesson.chapter[chapterIndex].chapterType;
    lesson.chapter[chapterIndex].chapterContent = updatedContent;

    // Save the updated lesson
    await lesson.save();

    // Step 5: Log the admin action
    await logAdminAction(
      req,
      "Update Chapter",
      true,
      "Lesson",
      lessonId,
      `Chapter ${
        chapterName || lesson.chapter[chapterIndex].chapterName
      } updated`
    );

    // Step 6: Return the updated chapter
    return res
      .status(200)
      .json({
        message: "Chapter updated successfully",
        chapter: lesson.chapter[chapterIndex],
      });
  } catch (err: unknown) {
    if (err instanceof Error) {
      // Log the failure
      await logAdminAction(
        req,
        "Update Chapter",
        false,
        "Lesson",
        lessonId,
        err.message
      );
      return res
        .status(500)
        .json({ message: "Error updating chapter", error: err.message });
    }

    return res.status(500).json({ message: "Unknown error occurred" });
  }
};

// Delete Chapter
export const deleteChapterController = async (req: Request, res: Response) => {
  const { lessonId, chapterNumber } = req.params;

  try {
    // Use the deleteChapter function to delete the specific chapter
    await deleteChapter(lessonId, chapterNumber);

    // Log the action
    await logAdminAction(
      req,
      "Delete Chapter",
      true,
      "Lesson",
      lessonId,
      `Deleted chapter: ${chapterNumber}`
    );

    return res.status(200).json({ message: "Chapter deleted successfully" });
  } catch (err) {
    // Log the failure
    if (err instanceof Error) {
      await logAdminAction(
        req,
        "Delete Chapter",
        false,
        "Lesson",
        lessonId,
        err.message
      );
      return res
        .status(500)
        .json({ message: "Error deleting chapter", error: err.message });
    }

    return res.status(500).json({ message: "Unknown error occurred" });
  }
};
