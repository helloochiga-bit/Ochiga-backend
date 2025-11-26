// src/event-processor/eventProcessor.ts
import { mqttClient } from "../mqtt";
import { evaluateEvent, Suggestion, DecisionEngine } from "./decision-engine/decisionEngine";
import { EventPayload } from "./rule-engine/rules";

// Process a single event
export async function processEvent(event: EventPayload): Promise<Suggestion | null> {
  try {
    console.log("📥 Incoming event:", event);

    const suggestion = evaluateEvent(event);

    if (suggestion) {
      console.log("💡 Suggestion generated:", suggestion);
      await DecisionEngine.createSuggestion(suggestion);
    }

    return suggestion;
  } catch (err) {
    console.error("❌ Error in processEvent:", err);
    return null;
  }
}

// Start background processor
export function startEventProcessor() {
  console.log("🚀 Event Processor started — waiting for real device events...");

  // Subscribe only once
  mqttClient.subscribe("ochiga/events/#", (err) => {
    if (err) console.error("❌ MQTT subscription failed:", err);
    else console.log("📡 Subscribed to ochiga/events/#");
  });

  // Handle real MQTT events
  mqttClient.on("message", (topic, message) => {
    try {
      const event: EventPayload = JSON.parse(message.toString());
      console.log(`📩 MQTT Event Received | Topic: ${topic}`);
      processEvent(event).catch((err) => console.error("❌ Error processing MQTT event:", err));
    } catch (err) {
      console.error("❌ Failed to parse MQTT message:", err);
    }
  });
}
