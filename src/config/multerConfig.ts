// src/config/multerConfig.ts
import multer from "multer";

const storage = multer.memoryStorage(); // Store files in memory for uploading to S3

const upload = multer({
  storage: storage,
 // limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB

});

export default upload;
