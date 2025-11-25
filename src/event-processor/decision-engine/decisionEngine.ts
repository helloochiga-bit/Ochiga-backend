// src/event-processor/decision-engine/decisionEngine.ts
import { rules } from "../rule-engine/rules";
import { EventPayload } from "../rule-engine/rules";

// Suggestion interface
export interface Suggestion {
  estateId: string;
  deviceId: string;
  ruleId?: string;
  message: string;
  action: "turn_off" | "dim_light" | "lock_door" | "notify";
  payload?: any;
  status?: "pending" | "accepted" | "dismissed" | "executed";
}

// Evaluate event against all rules
export function evaluateEvent(event: EventPayload): Suggestion | null {
  for (const rule of rules) {
    if (rule.condition(event)) {
      const action = rule.action(event);
      const suggestionAction: Suggestion["action"] =
        action.type === "device_command" ? "turn_off" : "notify";

      const suggestion: Suggestion = {
        estateId: event.deviceId, // replace with proper estateId if available
        deviceId: event.deviceId,
        ruleId: rule.id,
        message: action.message || "Action triggered",
        action: suggestionAction,
        payload: action,
        status: "pending",
      };
      return suggestion;
    }
  }
  return null;
}
