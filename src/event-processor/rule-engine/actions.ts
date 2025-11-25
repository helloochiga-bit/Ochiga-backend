// src/event-processor/rule-engine/actions.ts
import mqtt, { MqttClient } from "mqtt";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { RuleActionSuggestion } from "./rules";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase URL or service key not set");
}

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// MQTT client for device commands
export const mqttClient: MqttClient = mqtt.connect("mqtt://broker.hivemq.com");
mqttClient.on("connect", () => console.log("Rule Engine MQTT ready"));

// Save suggestion to DB
export async function pushSuggestion(payload: RuleActionSuggestion) {
  const { error } = await supabaseAdmin
    .from("ai_suggestions")
    .insert({ ...payload, created_at: new Date().toISOString(), status: "pending" });

  if (error) console.error("❌ Failed to save suggestion:", error);
  else console.log("✓ Suggestion saved:", payload.message);
}

// Publish device command to MQTT
export function publishCommand(device_id: string, command: any) {
  const topic = `ochiga/commands/${device_id}`;
  mqttClient.publish(topic, JSON.stringify(command));
  console.log("⚡ Publishing device command:", topic, command);
}
