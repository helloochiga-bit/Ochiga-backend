// src/event-processor/decision-engine/decisionEngine.ts
import { rules, EventPayload, RuleAction, RuleActionSuggestion, RuleActionDeviceCommand } from "../rule-engine/rules";
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
        (action as RuleActionSuggestion).type === "suggestion"
          ? (action as RuleActionSuggestion).message
          : "Action triggered";

      // Map action type to Suggestion.action
      const suggestionAction: Suggestion["action"] =
        (action as RuleActionDeviceCommand).type === "device_command" ? "turn_off" : "notify";

      const suggestion: Suggestion = {
        estateId: event.deviceId, // replace with real estateId if available
        deviceId: event.deviceId,
        ruleId: rule.id || "default_rule",
        message,
        action: suggestionAction,
        payload: action,
        status: "pending",
      };

      // Immediately execute actions
      if ((action as RuleActionDeviceCommand).type === "device_command") {
        const cmd = action as RuleActionDeviceCommand;
        publishCommand(cmd.device_id, cmd.command);
      }
      if ((action as RuleActionSuggestion).type === "suggestion") {
        pushSuggestion(action as RuleActionSuggestion);
      }

      return suggestion;
    }
  }

  return null;
}
