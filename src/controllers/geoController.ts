// src/controllers/aiGeoController.ts
import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/client";
import { calculateDistance } from "../utils/geoMath";
import { queryLLM } from "../utils/llmClient";

/**
 * POST /api/ai/geo
 */
export async function handleGeoQuery(req: Request, res: Response) {
  try {
    const { text, lat, lng } = req.body;
    if (!text) return res.status(400).json({ error: "text query required" });

    // 1️⃣ Ask GPT to extract structured intent
    const llmPrompt = `
You are a smart geolocation assistant for a smart estate system. 
The user query is: """${text}"""
Respond ONLY as JSON with fields:
{
  "intent": "nearest_device" | "visitor_distance" | "device_location" | "unknown",
  "params": {
    "deviceId": "<uuid if mentioned>",
    "visitorId": "<uuid if mentioned>",
    "estateId": "<estateId if needed>",
    "lat": <number if user provided>,
    "lng": <number if user provided>,
    "radius": <number in meters if mentioned>
  }
}
`;

    const llmResponse = await queryLLM(llmPrompt);

    let parsed: any;
    try {
      parsed = JSON.parse(llmResponse);
    } catch (err) {
      console.warn("LLM JSON parse error, fallback:", err);
      return res.status(500).json({ error: "LLM failed to return valid JSON", raw: llmResponse });
    }

    const { intent, params } = parsed;

    // 2️⃣ Route to your existing handlers
    switch (intent) {
      case "nearest_device":
        if (!params.lat || !params.lng) return res.status(400).json({ error: "lat/lng required for nearest_device" });
        return getDevicesNear(params.lat, params.lng, params.radius || 200, res);

      case "device_location":
        if (!params.deviceId) return res.status(400).json({ error: "deviceId required for device_location" });
        return getDeviceLocation(params.deviceId, res);

      case "visitor_distance":
        if (!params.visitorId || !params.estateId) return res.status(400).json({ error: "visitorId + estateId required" });
        return getVisitorDistance(params.visitorId, params.estateId, res);

      default:
        return res.json({ message: "Could not understand your query. Try: 'nearest device', 'where is device <id>', 'how far is visitor <id> from estate'" });
    }

  } catch (err: any) {
    console.error("AI LLM geo error:", err);
    return res.status(500).json({ error: err.message });
  }
}

/* -----------------------------
   Helper functions re-used
----------------------------- */

async function getDevicesNear(lat: number, lng: number, radius: number, res: Response) {
  try {
    const { data, error } = await supabaseAdmin.rpc("devices_near", {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: radius,
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: `Found ${data.length} device(s) within ${radius}m`, devices: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

async function getDeviceLocation(deviceId: string, res: Response) {
  const { data, error } = await supabaseAdmin.from("devices").select("*").eq("id", deviceId).single();
  if (error) return res.status(404).json({ error: error.message });
  return res.json({ message: `Device ${data.name} at ${data.latitude},${data.longitude}`, device: data });
}

async function getVisitorDistance(visitorId: string, estateId: string, res: Response) {
  const { data: visitor, error: vErr } = await supabaseAdmin.from("visitors").select("*").eq("id", visitorId).single();
  if (vErr) return res.status(404).json({ error: vErr.message });

  const { data: estate, error: eErr } = await supabaseAdmin.from("estates").select("*").eq("id", estateId).single();
  if (eErr) return res.status(404).json({ error: eErr.message });

  if (!visitor.current_lat || !visitor.current_lng || !estate.lat || !estate.lng)
    return res.json({ message: "Coordinates missing for visitor or estate" });

  const distance = calculateDistance(Number(visitor.current_lat), Number(visitor.current_lng), Number(estate.lat), Number(estate.lng));
  return res.json({ message: `Visitor is approximately ${Math.round(distance)} meters from estate`, distanceMeters: distance });
}
