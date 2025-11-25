// src/event-processor/decision-engine/decisionEngine.ts
import { rules, EventPayload, RuleAction, RuleActionSuggestion, RuleActionDeviceCommand } from "../rule-engine/rules";
import { publishCommand, pushSuggestion } from "../rule-engine/actions";

// Suggestion interface for TypeScript
export interface Suggestion {
  estateId: string;
  deviceId: string;
  ruleId?: string;
  message: string;
  action: "turn_off" | "dim_light" | "lock_door" | "notify";
  payload?: any;
  status?: "pending" | "accepted" | "dismissed" | "executed";
}

// Evaluate an event against all rules
export function evaluateEvent(event: EventPayload): Suggestion | null {
  for (const rule of rules) {
    if (rule.condition(event)) {
      const action = rule.action(event);

      const message =
        (action as RuleActionSuggestion).type === "suggestion"
          ? (action as RuleActionSuggestion).message
          : "Action triggered";

      const suggestionAction: Suggestion["action"] =
        (action as RuleActionDeviceCommand).type === "device_command" ? "turn_off" : "notify";

      const suggestion: Suggestion = {
        estateId: event.estate_id || event.estateId,
        deviceId: event.device_id || event.deviceId,
        ruleId: rule.id || "default_rule",
        message,
        action: suggestionAction,
        payload: action,
        status: "pending",
      };

      // Execute device commands immediately
      if ((action as RuleActionDeviceCommand).type === "device_command") {
        const cmd = action as RuleActionDeviceCommand;
        publishCommand(cmd.device_id, cmd.command);
      }

      // Push suggestions if needed
      if ((action as RuleActionSuggestion).type === "suggestion") {
        pushSuggestion(action as RuleActionSuggestion);
      }

      return suggestion;
    }
  }

  return null;
}
