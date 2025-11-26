// src/mqtt.ts
import mqtt from "mqtt";

const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://mqtt:1883";
const username = process.env.MQTT_USERNAME || "";
const password = process.env.MQTT_PASSWORD || "";
const clientId = process.env.MQTT_CLIENT_ID || "ochiga_event_processor";

export const mqttClient = mqtt.connect(brokerUrl, {
  username,
  password,
  clientId,
});

mqttClient.on("connect", () => {
  console.log(`✅ MQTT connected to broker at ${brokerUrl}`);
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT client error:", err);
});
