import QRCode from "qrcode";
import { uploadToS3 } from "./s3Service";

export async function createQrForLink(link: string) {
  const qrPng = await QRCode.toBuffer(link, { type: "png", width: 600 });
  const filename = `qr_${Date.now()}.png`;

  const url = await uploadToS3(filename, qrPng, "image/png");

  return { filename, url };
}

export function getQrS3Url(filename: string) {
  return `https://your-s3-bucket.s3.amazonaws.com/${filename}`;
}
