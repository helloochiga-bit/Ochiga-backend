// src/event-processor/eventProcessor.ts
import { evaluateEvent } from "./decisionEngine";
import { DecisionEngine } from "../decision-engine";
import { mqttClient } from "../mqtt";

// Event interface
export interface Event {
  deviceId: string;
  type: string;
  payload: any;
  timestamp?: Date;
}

// Suggestion interface
export interface Suggestion {
  estateId: string;
  deviceId: string;
  ruleId?: string;
  message: string;
  action: "turn_off" | "dim_light" | "lock_door";
  payload?: any;
  status?: "pending" | "accepted" | "dismissed" | "executed";
}

// Process a single event into a suggestion
export async function processEvent(event: Event): Promise<Suggestion | null> {
  console.log("Processing event:", event);

  // Evaluate against rules
  const suggestion = evaluateEvent(event);

  if (suggestion) {
    // Save suggestion in DB + emit via Socket.io
    await DecisionEngine.createSuggestion(suggestion);
  }

  return suggestion;
}

// Start the background event processor
export function startEventProcessor() {
  console.log("Event Processor started");

  // Optional: listen to real device events via MQTT
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

  // Optional: simulate events for testing
  setInterval(async () => {
    const simulatedEvent: Event = {
      deviceId: "device-001",
      type: "motion_detected",
      payload: { motion: Math.random() > 0.5 },
    };
    await processEvent(simulatedEvent);
  }, 15000); // every 15s
}
