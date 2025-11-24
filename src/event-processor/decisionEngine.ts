import { rules } from "./rule-engine/rules";
import { Event } from "./eventProcessor";

// Suggestion interface
export interface Suggestion {
  estateId: string;
  deviceId: string;
  ruleId?: string;
  message: string;
  action: "turn_off" | "dim_light" | "lock_door" | "notify"; // include "notify"
  payload?: any;
  status?: "pending" | "accepted" | "dismissed" | "executed";
}

// Evaluate an event against all rules and return a Suggestion
export function evaluateEvent(event: Event): Suggestion | null {
  for (const rule of rules) {
    if (rule.condition(event)) {
      const action = rule.action(event);

      // Map action type to Suggestion.action
      const suggestionAction: Suggestion["action"] =
        action.type === "device_command" ? "turn_off" : "notify";

      const suggestion: Suggestion = {
        estateId: event.deviceId, // replace with actual estateId if available
        deviceId: event.deviceId,
        ruleId: rule.id || "default_rule",
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
