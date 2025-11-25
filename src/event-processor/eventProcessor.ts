// src/event-processor/eventProcessor.ts
import { mqttClient } from "../mqtt";
import { evaluateEvent, Suggestion } from "./decision-engine/decisionEngine";

// Process single event safely
export async function processEvent(event: Record<string, any>): Promise<Suggestion | null> {
  try {
    console.log("Processing event:", event);

    const suggestion = evaluateEvent(event);

    if (suggestion) {
      // Convert camelCase to snake_case for DB
      const fullSuggestion = {
        estate_id: suggestion.estateId || "default_estate",
        device_id: suggestion.deviceId || "unknown_device",
        rule_id: suggestion.ruleId || "default_rule",
        message: suggestion.message,
        action: suggestion.action,
        payload: suggestion.payload || {},
        status: suggestion.status || "pending",
      };

      // Save suggestion to DB
      await import("./decision-engine/db").then(({ DecisionEngine }) =>
        DecisionEngine.createSuggestion(fullSuggestion)
      );
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

  // Subscribe to MQTT device events
  mqttClient.subscribe("ochiga/events/#", (err) => {
    if (err) {
      console.error("MQTT subscription failed:", err);
    } else {
      console.log("Subscribed to device events via MQTT");
    }
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const event = JSON.parse(message.toString());

      // Ensure keys are snake_case before processing
      const snakeEvent = {
        device_id: event.deviceId || event.device_id,
        event_type: event.eventType || event.event_type,
        payload: event.payload || {},
      };

      processEvent(snakeEvent).catch((err) => {
        console.error("Error processing MQTT event:", err);
      });
    } catch (err) {
      console.error("Failed to parse MQTT event:", err);
    }
  });

  // Simulate events for testing
  setInterval(() => {
    const simulatedEvent = {
      device_id: "device-001",
      event_type: "motion_detected",
      payload: { motion: Math.random() > 0.5 },
    };

    processEvent(simulatedEvent).catch((err) => {
      console.error("Error processing simulated event:", err);
    });
  }, 15000);
}
