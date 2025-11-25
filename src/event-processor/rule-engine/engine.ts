import { rules } from "./rules.ts";
import { pushSuggestion, publishCommand } from "./actions.js";

export function evaluateRules(event) {
  console.log("🧠 Evaluating rules for event:", event.event_type);

  rules.forEach(rule => {
    try {
      const match = rule.condition(event);

      if (!match) return;

      console.log(`→ Rule Matched: ${rule.id}`);

      const action = rule.action(event);

      if (action.type === "suggestion") {
        pushSuggestion(action);
      }

      if (action.type === "device_command") {
        publishCommand(action.device_id, action.command);
      }

    } catch (err) {
      console.error("❌ Error evaluating rule:", rule.id, err);
    }
  });
}
