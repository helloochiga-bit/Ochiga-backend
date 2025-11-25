// src/event-processor/rule-engine/engine.ts
import { rules, EventPayload, RuleAction } from "./rules";
import { pushSuggestion, publishCommand } from "./actions";

export function evaluateRules(event: EventPayload) {
  console.log("🧠 Evaluating rules for event:", event.event_type);

  rules.forEach((rule) => {
    try {
      if (!rule.condition(event)) return;

      console.log(`→ Rule Matched: ${rule.id}`);
      const action: RuleAction = rule.action(event);

      if (action.type === "suggestion") pushSuggestion(action);
      if (action.type === "device_command") publishCommand(action.device_id, action.command);
    } catch (err) {
      console.error("❌ Error evaluating rule:", rule.id, err);
    }
  });
}
