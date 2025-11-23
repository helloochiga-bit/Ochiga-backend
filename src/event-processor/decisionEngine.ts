// src/event-processor/decisionEngine.ts
import { rules } from "./rule-engine/rules";
import { Event, Suggestion } from "./eventProcessor";

export function evaluateEvent(event: Event): Suggestion | null {
  for (const rule of rules) {
    if (rule.condition(event)) {
      const action = rule.action(event);
      return {
        estateId: event.deviceId, // placeholder
        deviceId: event.deviceId,
        message: action.message || "Action triggered",
        action: action.type === "device_command" ? "turn_off" : "notify",
        payload: action,
        status: "pending",
      };
    }
  }
  return null;
}
