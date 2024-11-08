/* // src/utils/multipartUpload.ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3Client";
import { Readable } from "stream";

export const multipartUpload = async (
  buffer: Buffer,
  fileName: string,
  contentType: string
) => {
  try {
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME as string,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

  } catch (error) {
    console.error("S3 upload error: ", error);
    throw new Error("Failed to upload file to S3");
  }
};
 */

import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3Client";
import { Readable } from "stream";

export const multipartUpload = async (
  buffer: Buffer,
  fileName: string,
  contentType: string
) => {
  const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // Each part should be at least 5MB
  const bucketName = process.env.AWS_BUCKET_NAME as string;

  try {
    // Step 1: Initiate the multipart upload
    const createUploadParams = {
      Bucket: bucketName,
      Key: fileName,
      ContentType: contentType,
    };
    const createCommand = new CreateMultipartUploadCommand(createUploadParams);
    const uploadResponse = await s3.send(createCommand);
    const uploadId = uploadResponse.UploadId;

    // Step 2: Split the buffer into chunks and upload parts
    const partUploadPromises = [];
    const numberOfParts = Math.ceil(buffer.length / MAX_CHUNK_SIZE);

    for (let partNumber = 0; partNumber < numberOfParts; partNumber++) {
      const start = partNumber * MAX_CHUNK_SIZE;
      const end = Math.min(start + MAX_CHUNK_SIZE, buffer.length);
      const partBuffer = buffer.slice(start, end);

      const uploadPartParams = {
        Bucket: bucketName,
        Key: fileName,
        PartNumber: partNumber + 1, // Part numbers start from 1
        UploadId: uploadId,
        Body: partBuffer,
      };

      const uploadPartCommand = new UploadPartCommand(uploadPartParams);
      const partUpload = s3.send(uploadPartCommand);
      partUploadPromises.push(partUpload);
    }

    // Wait for all parts to be uploaded
    const uploadedParts = await Promise.all(partUploadPromises);

    // Step 3: Complete the multipart upload
    const completeUploadParams = {
      Bucket: bucketName,
      Key: fileName,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: uploadedParts.map((part, index) => ({
          ETag: part.ETag,
          PartNumber: index + 1,
        })),
      },
    };

    const completeCommand = new CompleteMultipartUploadCommand(completeUploadParams);
    await s3.send(completeCommand);

    console.log("Multipart upload completed successfully");
  } catch (error) {
    console.error("Multipart upload error: ", error);
    throw new Error("Failed to upload large file to S3");
  }
};
