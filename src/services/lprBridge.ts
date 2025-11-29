// src/services/lprBridge.ts
import axios from "axios";

const YOLO_BRIDGE = process.env.YOLO_BRIDGE_URL || "http://localhost:9000";

export async function detectPlateFromImage(base64Image: string) {
  try {
    const res = await axios.post(`${YOLO_BRIDGE}/detect`, { image: base64Image }, { timeout: 20000 });
    return res.data; // expected { plates: [{ plate: 'ABC123', score: 0.95 }] }
  } catch (err) {
    console.error("lprBridge error", err);
    return null;
  }
}
