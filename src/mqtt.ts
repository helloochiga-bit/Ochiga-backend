import mqtt from "mqtt";

// Replace with your broker URL and credentials
export const mqttClient = mqtt.connect("mqtt://YOUR_BROKER_URL", {
  username: "YOUR_USERNAME",
  password: "YOUR_PASSWORD",
});

mqttClient.on("connect", () => {
  console.log("✅ MQTT connected to broker");

  // Subscribe to device events
  mqttClient.subscribe("ochiga/events/#", (err) => {
    if (!err) console.log("✅ Subscribed to device events");
  });
});

mqttClient.on("message", (topic, message) => {
  try {
    const event = JSON.parse(message.toString());
    // Send event to EventProcessor
    import("./event-processor/eventProcessor").then(({ processEvent }) => {
      processEvent(event);
    });
  } catch (err) {
    console.error("❌ Failed to parse MQTT event:", err);
  }
});
