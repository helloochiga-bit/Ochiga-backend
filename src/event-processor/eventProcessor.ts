// src/event-processor/eventProcessor.ts
import { mqttClient } from "../mqtt"; // ensure this is correct
import { evaluateEvent, EventPayload, Suggestion, DecisionEngine } from "./decision-engine/index";

// Process single event
export async function processEvent(event: EventPayload): Promise<Suggestion | null> {
  console.log("Processing event:", event);

  const suggestion = evaluateEvent(event);

  if (suggestion) {
    const fullSuggestion: Suggestion = {
      estateId: suggestion.estateId || "default_estate",
      deviceId: suggestion.deviceId || "unknown_device",
      ruleId: suggestion.ruleId || "default_rule",
      message: suggestion.message,
      action: suggestion.action,
      payload: suggestion.payload || {},
      status: suggestion.status || "pending",
    };

    await DecisionEngine.createSuggestion(fullSuggestion);
  }

  return suggestion;
}

// Start background processor
export function startEventProcessor() {
  console.log("Event Processor started");

  mqttClient.subscribe("ochiga/events/#", (err) => {
    if (!err) console.log("Subscribed to device events via MQTT");
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const event: EventPayload = JSON.parse(message.toString());
      processEvent(event);
    } catch (err) {
      console.error("Failed to parse MQTT event:", err);
    }
  });

  // Simulate events for testing
  setInterval(async () => {
    const simulatedEvent: EventPayload = {
      deviceId: "device-001",
      eventType: "motion_detected",
      payload: { motion: Math.random() > 0.5 },
    };
    await processEvent(simulatedEvent);
  }, 15000);
}
