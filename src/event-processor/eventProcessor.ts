// src/event-processor/eventProcessor.ts
import { mqttClient } from "../mqtt";
import { evaluateEvent, EventPayload, Suggestion, DecisionEngine } from "./decision-engine/index";

/**
 * Process a single event safely
 */
export async function processEvent(event: EventPayload): Promise<Suggestion | null> {
  try {
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

      // Convert to snake_case only when sending to the database
      await DecisionEngine.createSuggestion({
        estate_id: fullSuggestion.estateId,
        device_id: fullSuggestion.deviceId,
        rule_id: fullSuggestion.ruleId,
        message: fullSuggestion.message,
        action: fullSuggestion.action,
        payload: fullSuggestion.payload,
        status: fullSuggestion.status,
      });
    }

    return suggestion;
  } catch (err) {
    console.error("Error in processEvent:", err);
    return null; // prevent crash
  }
}

/**
 * Start background processor
 */
export function startEventProcessor() {
  console.log("Event Processor started");

  mqttClient.subscribe("ochiga/events/#", (err) => {
    if (err) {
      console.error("MQTT subscription failed:", err);
    } else {
      console.log("Subscribed to device events via MQTT");
    }
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const event: EventPayload = JSON.parse(message.toString());
      processEvent(event).catch((err) => {
        console.error("Error processing MQTT event:", err);
      });
    } catch (err) {
      console.error("Failed to parse MQTT event:", err);
    }
  });

  // Simulate events for testing
  setInterval(() => {
    const simulatedEvent: EventPayload = {
      deviceId: "device-001",
      eventType: "motion_detected",
      payload: { motion: Math.random() > 0.5 },
    };

    processEvent(simulatedEvent).catch((err) => {
      console.error("Error processing simulated event:", err);
    });
  }, 15000);
}
