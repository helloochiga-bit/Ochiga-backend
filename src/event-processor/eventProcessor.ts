// src/event-processor/eventProcessor.ts
import { mqttClient } from "../mqtt"; // Make sure this path is correct
import { evaluateEvent, Suggestion } from "./decision-engine/index";
import { DecisionEngine } from "./decision-engine/index";
import { EventPayload } from "./decision-engine/index";

// Event interface
export interface Event {
  deviceId: string;
  type: string;
  payload: any;
  timestamp?: Date;
}

// Process a single event into a suggestion
export async function processEvent(event: Event): Promise<Suggestion | null> {
  console.log("Processing event:", event);

  // Evaluate against rules
  const suggestion = evaluateEvent(event);

  if (suggestion) {
    // Ensure all required fields are present before saving
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

// Start the background event processor
export function startEventProcessor() {
  console.log("Event Processor started");

  // Listen to real device events via MQTT
  mqttClient.subscribe("ochiga/events/#", (err) => {
    if (!err) console.log("Subscribed to device events via MQTT");
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const event: Event = JSON.parse(message.toString());
      processEvent(event);
    } catch (err) {
      console.error("Failed to parse MQTT event:", err);
    }
  });

  // Simulate events for testing
  setInterval(async () => {
    const simulatedEvent: Event = {
      deviceId: "device-001",
      type: "motion_detected",
      payload: { motion: Math.random() > 0.5 },
    };
    await processEvent(simulatedEvent);
  }, 15000); // every 15 seconds
}
