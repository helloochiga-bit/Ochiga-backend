import { rules, EventPayload, RuleAction, RuleActionSuggestion } from "../rule-engine/rules";
import { DecisionEngine } from "../../decision-engine";
import { pushSuggestion, publishCommand } from "../rule-engine/actions";

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

// Evaluate an event against all rules and return a Suggestion
export function evaluateEvent(event: EventPayload): Suggestion | null {
  for (const rule of rules) {
    if (rule.condition(event)) {
      const action = rule.action(event);

      // Narrow action type for message
      const message =
        action.type === "suggestion"
          ? action.message
          : "Action triggered";

      // Map action type to Suggestion.action
      const suggestionAction: Suggestion["action"] =
        action.type === "device_command" ? "turn_off" : "notify";

      const suggestion: Suggestion = {
        estateId: event.deviceId, // replace with real estateId if available
        deviceId: event.deviceId,
        ruleId: rule.id || "default_rule",
        message,
        action: suggestionAction,
        payload: action,
        status: "pending",
      };

      // Also immediately execute action for device_command
      if (action.type === "device_command") {
        publishCommand(action.device_id, action.command);
      }
      if (action.type === "suggestion") {
        pushSuggestion(action);
      }

      return suggestion;
    }
  }

  return null;
}
