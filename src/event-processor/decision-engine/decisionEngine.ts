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

      const message =
        (action as RuleActionSuggestion).type === "suggestion"
          ? (action as RuleActionSuggestion).message
          : "Action triggered";

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

      // Execute actions immediately
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

// DecisionEngine object that handles DB insertion
export const DecisionEngine = {
  async createSuggestion(suggestion: Suggestion) {
    // Convert camelCase to snake_case before sending to PostgREST/Supabase
    const payload = {
      estate_id: suggestion.estateId,
      device_id: suggestion.deviceId,
      rule_id: suggestion.ruleId,
      message: suggestion.message,
      action: suggestion.action,
      payload: suggestion.payload || {},
      status: suggestion.status || "pending",
    };

    // Replace with your actual Supabase client code
    // For example:
    // await supabase.from("suggestions").insert(payload);
    console.log("Saved suggestion to DB:", payload);
  },
};

// ✅ Export EventPayload type so eventProcessor can import it
export type { EventPayload };
