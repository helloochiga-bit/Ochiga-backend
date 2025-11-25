import mqtt from "mqtt";
import { createClient } from "@supabase/supabase-js";

// ----------------------------
// ENV
// ----------------------------
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

// Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// MQTT client for commands
const mqttClient = mqtt.connect("mqtt://broker.hivemq.com");

mqttClient.on("connect", () => console.log("Rule Engine MQTT ready."));

// ----------------------------------------------------------
// EXEC: Save suggestion to DB
// ----------------------------------------------------------
export async function pushSuggestion(payload) {
  const { error } = await supabase
    .from("ai_suggestions")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
      status: "pending",
    });

  if (error) {
    console.error("❌ Failed to save suggestion:", error);
  } else {
    console.log("✓ Suggestion saved:", payload.title);
  }
}

// ----------------------------------------------------------
// EXEC: Publish device command to MQTT
// ----------------------------------------------------------
export function publishCommand(device_id, command) {
  const topic = `ochiga/commands/${device_id}`;
  mqttClient.publish(topic, JSON.stringify(command));
  console.log("⚡ Publishing device command:", topic, command);
}
