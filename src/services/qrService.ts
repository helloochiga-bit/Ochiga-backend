// src/services/qrService.ts
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { uploadFileToS3 } from "./storageService"; // implemented below

const TEMP_DIR = process.env.QR_TEMP_PATH || "/tmp";

export async function createQrForLink(link: string, visitorId: string) {
  // create png buffer
  const filename = `visitor-${visitorId}-${Date.now()}.png`;
  const filepath = path.join(TEMP_DIR, filename);
  try {
    await QRCode.toFile(filepath, link, { type: "png", errorCorrectionLevel: "H" });
    // upload to S3 (or Supabase storage)
    const s3Url = await uploadFileToS3(filepath, filename);
    // cleanup
    try { fs.unlinkSync(filepath); } catch(_) {}
    return s3Url;
  } catch (err) {
    console.error("createQrForLink err", err);
    return null;
  }
}
