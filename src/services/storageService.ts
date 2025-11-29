// src/services/storageService.ts
import AWS from "aws-sdk";
import fs from "fs";

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_API_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.S3_REGION,
});

export async function uploadFileToS3(localPath: string, key: string) {
  const bucket = process.env.S3_BUCKET_NAME!;
  const data = fs.readFileSync(localPath);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: data,
    ACL: "public-read",
    ContentType: "image/png",
  };
  await s3.putObject(params).promise();
  return `${process.env.S3_BUCKET_URL}/${key}`;
}
