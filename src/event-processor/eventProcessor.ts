// src/event-processor/eventProcessor.ts
import { mqttClient } from "../mqtt";
import { evaluateEvent, Suggestion, DecisionEngine } from "./decision-engine/decisionEngine";
import { EventPayload } from "./rule-engine/rules";

// Process single event safely
export async function processEvent(event: EventPayload): Promise<Suggestion | null> {
  try {
    console.log("Processing event:", event);

    const suggestion = evaluateEvent(event);

    if (suggestion) {
      await DecisionEngine.createSuggestion(suggestion);
    }

    return suggestion;
  } catch (err) {
    console.error("Error in processEvent:", err);
    return null;
  }
}

// Start background processor
export function startEventProcessor() {
  console.log("Event Processor started");

  mqttClient.subscribe("ochiga/events/#", (err) => {
    if (err) console.error("MQTT subscription failed:", err);
    else console.log("Subscribed to device events via MQTT");
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const event: EventPayload = JSON.parse(message.toString());
      processEvent(event).catch((err) => console.error("Error processing MQTT event:", err));
    } catch (err) {
      console.error("Failed to parse MQTT event:", err);
    }
  });

  // Simulate events for testing
  setInterval(() => {
    const simulatedEvent: EventPayload = {
      event_type: "motion_detected",
      device_id: "device-001",
      estate_id: "default_estate",
      data: { motion: Math.random() > 0.5 },
    };
    processEvent(simulatedEvent).catch((err) => console.error("Error processing simulated event:", err));
  }, 15000);
}
