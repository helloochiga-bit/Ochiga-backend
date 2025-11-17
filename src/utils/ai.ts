// src/utils/ai.ts
import OpenAI from "openai";
import { z } from "zod";
import { AutomationSchema } from "./validation";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) console.warn("OPENAI_API_KEY not set — AI features disabled");

const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function nluToAutomation(prompt: string, devices: any[]) {
  if (!client) throw new Error("AI client not configured");

  // system prompt: produce JSON only matching automation schema
  const system = `You are a strict assistant that converts a user's natural language instruction into a JSON automation object.
Return ONLY valid JSON that matches this shape:
{
  "name": string,
  "trigger": { "type": "time"|"device"|"nlu", ... },
  "action": { "type": "device", "device_id": "<device id or friendly name>", "command": {...} },
  "metadata": {...}
}
Devices: ${JSON.stringify(devices)}
If a device is referenced by friendly name, try to map it by device.name. If uncertain, set device_id to null.
Respond with JSON only.`;

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    max_tokens: 600,
    temperature: 0.1,
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("No response from AI");

  // try to find JSON in text
  let jsonText = text;
  // remove markdown fences if present
  jsonText = jsonText.replace(/```json|```/gi, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    // fallback: try to extract {...} substring
    const first = jsonText.indexOf("{");
    const last = jsonText.lastIndexOf("}");
    if (first === -1 || last === -1) throw new Error("AI did not return valid JSON");
    const sub = jsonText.substring(first, last + 1);
    parsed = JSON.parse(sub);
  }

  // Basic normalization: try to map friendly device name to id
  if (parsed?.action?.device_id && typeof parsed.action.device_id === "string") {
    const friendly = parsed.action.device_id;
    const found = devices.find((d: any) => d.name && d.name.toLowerCase() === String(friendly).toLowerCase());
    if (found) parsed.action.device_id = found.id;
    else {
      // leave as-is; let validation catch missing id
    }
  }

  // validate against schema
  const result = AutomationSchema.parse(parsed);
  return result;
}
