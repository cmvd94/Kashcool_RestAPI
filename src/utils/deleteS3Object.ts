import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3Client";


// Function to delete an object from S3 using AWS SDK v3
export const deleteS3Object = async (key: string): Promise<void> => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME as string,  // Your S3 bucket name
    Key: key,  // File path to delete
  };

  try {
    const command = new DeleteObjectCommand(params);
    const boolean = await s3.send(command);
    console.log(process.env.AWS_BUCKET_NAME)
    console.log(boolean);
    console.log(`File deleted successfully from S3: ${key}`);
  } catch (err) {
    console.error(`Error deleting file from S3: ${key}`, err);
    throw new Error("Failed to delete old image from S3");
  }
};
