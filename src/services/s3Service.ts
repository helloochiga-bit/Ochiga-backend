// src/services/s3Service.ts
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

export async function uploadToS3(filename: string, buffer: Buffer, mime: string): Promise<string> {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: filename,
    Body: buffer,
    ContentType: mime,
    ACL: "public-read",
  };

  await s3.putObject(params).promise();

  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${filename}`;
}
