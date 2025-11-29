// src/services/qrService.ts

import QRCode from "qrcode";
import { uploadToS3 } from "../utils/s3Upload";

export async function createQrForLink(link: string, visitorId: string): Promise<string> {
  // generate QR png buffer
  const qrBuffer = await QRCode.toBuffer(link, {
    errorCorrectionLevel: "H",
    type: "png",
    margin: 1,
    width: 600
  });

  // upload to S3
  const key = `visitors/qr/${visitorId}.png`;
  const url = await uploadToS3(qrBuffer, key, "image/png");

  return url;
}
