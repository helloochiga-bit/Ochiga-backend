// src/services/qrService.ts
import QRCode from "qrcode";
import { uploadToS3 } from "./s3Service"; // updated import path

/**
 * Generates a QR code PNG for a given link and uploads it to S3.
 * @param link The URL or string to encode in the QR code
 * @param visitorId Unique visitor ID for naming the QR file
 * @returns Public URL to the uploaded QR code PNG
 */
export async function createQrForLink(link: string, visitorId: string): Promise<string> {
  // Generate QR PNG buffer
  const qrBuffer = await QRCode.toBuffer(link, {
    errorCorrectionLevel: "H",
    type: "png",
    margin: 1,
    width: 600,
  });

  // Upload to S3
  const key = `visitors/qr/${visitorId}.png`;
  const url = await uploadToS3(key, qrBuffer, "image/png");

  return url;
}
