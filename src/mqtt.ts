// src/mqtt.ts
import mqtt from "mqtt";

// Read MQTT connection details from env
const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://mqtt:1883";
const username = process.env.MQTT_USERNAME || "";
const password = process.env.MQTT_PASSWORD || "";
const clientId = process.env.MQTT_CLIENT_ID || "ochiga_event_processor";

// Connect to broker
export const mqttClient = mqtt.connect(brokerUrl, {
  username,
  password,
  clientId,
});

mqttClient.on("connect", () => {
  console.log(`✅ MQTT connected to broker at ${brokerUrl}`);

  // Subscribe to device events
  mqttClient.subscribe("ochiga/events/#", (err) => {
    if (!err) console.log("✅ Subscribed to device events");
    else console.error("❌ MQTT subscription failed:", err);
  });
});

mqttClient.on("message", (topic, message) => {
  try {
    const event = JSON.parse(message.toString());
    // Send event to EventProcessor
    import("./event-processor/eventProcessor").then(({ processEvent }) => {
      processEvent(event).catch((err) => {
        console.error("❌ Error processing event:", err);
      });
    });
  } catch (err) {
    console.error("❌ Failed to parse MQTT event:", err);
  }
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT client error:", err);
});
