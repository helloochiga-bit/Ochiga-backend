// src/event-processor/decision-engine/decisionEngine.ts
import { rules, EventPayload, RuleActionDeviceCommand, RuleActionSuggestion } from "../rule-engine/rules";
import { pushSuggestion, publishCommand } from "../rule-engine/actions";

// Suggestion interface for DB
export interface Suggestion {
  estate_id: string;
  device_id: string;
  rule_id?: string;
  message: string;
  action: "turn_off" | "dim_light" | "lock_door" | "notify";
  payload?: any;
  status?: "pending" | "accepted" | "dismissed" | "executed";
}

// DecisionEngine mock (replace with your DB integration)
export const DecisionEngine = {
  async createSuggestion(suggestion: Suggestion) {
    console.log("💡 Suggestion created:", suggestion);
    // TODO: insert into Supabase/Postgres
  },
};

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
        estate_id: event.estate_id || "default_estate",
        device_id: event.device_id,
        rule_id: rule.id || "default_rule",
        message,
        action: suggestionAction,
        payload: action,
        status: "pending",
      };

      // Immediately execute actions
      if ((action as RuleActionDeviceCommand).type === "device_command") {
        publishCommand((action as RuleActionDeviceCommand).device_id, (action as RuleActionDeviceCommand).command);
      }
      if ((action as RuleActionSuggestion).type === "suggestion") {
        pushSuggestion(action as RuleActionSuggestion);
      }

      return suggestion;
    }
  }

  return null;
}
