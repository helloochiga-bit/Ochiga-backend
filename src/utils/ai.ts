// src/utils/ai.ts
import OpenAI from "openai";
import { AutomationSchema } from "./validation";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) console.warn("OPENAI_API_KEY not set — AI features disabled");

const client = apiKey ? new OpenAI({ apiKey }) : null;

export type NLUContext = {
  devices: any[];
  homes?: any[];
  estates?: any[];
};

/**
 * Converts natural language prompt into structured automation JSON
 * @param prompt user instruction in natural language
 * @param context devices, homes, estates info for AI reference
 */
export async function nluToAutomation(prompt: string, context: NLUContext) {
  if (!client) throw new Error("AI client not configured");

  const { devices = [], homes = [], estates = [] } = context || {};

  const system = `You are a strict assistant that converts a user's natural language instruction into a JSON automation object.
Return ONLY valid JSON matching this shape:
{
  "name": string,
  "trigger": { "type": "time"|"device"|"nlu"|"location", "home_id"?: string, "coordinates"?: {lat:number,lng:number}, ... },
  "action": { "type": "device", "device_id": "<device id or friendly name>", "command": {...} },
  "metadata": {...}
}
Devices: ${JSON.stringify(devices)}
Homes: ${JSON.stringify(homes)}
Estates: ${JSON.stringify(estates)}
If a device, home, or estate is referenced by friendly name, map it to the correct ID. If uncertain, leave as null.
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

  let text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("No response from AI");

  // remove markdown fences if present
  text = text.replace(/```json|```/gi, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    // fallback: try to extract {...} substring
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1) throw new Error("AI did not return valid JSON");
    const sub = text.substring(first, last + 1);
    parsed = JSON.parse(sub);
  }

  // Map device friendly name to ID
  if (parsed?.action?.device_id && typeof parsed.action.device_id === "string") {
    const friendly = parsed.action.device_id.toLowerCase();
    const found = devices.find((d: any) => d.name?.toLowerCase() === friendly || d.id === parsed.action.device_id);
    if (found) parsed.action.device_id = found.id;
  }

  // Map home friendly name to ID for location triggers
  if (parsed?.trigger?.type === "location" && parsed.trigger.home_name) {
    const home = homes.find((h: any) => h.name && h.name.toLowerCase() === parsed.trigger.home_name.toLowerCase());
    if (home) parsed.trigger.home_id = home.id;
    delete parsed.trigger.home_name;
  }

  // Map estate if referenced
  if (parsed?.trigger?.estate_name) {
    const estate = estates.find((e: any) => e.name && e.name.toLowerCase() === parsed.trigger.estate_name.toLowerCase());
    if (estate) parsed.trigger.estate_id = estate.id;
    delete parsed.trigger.estate_name;
  }

  // Validate final JSON (this will throw if invalid)
  return AutomationSchema.parse(parsed);
}
