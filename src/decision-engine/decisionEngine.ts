import { rules, EventPayload } from "./rule-engine/rules";

export async function processEvent(event: EventPayload) {
  try {
    console.log("🔎 Processing event:", event);

    for (const rule of rules) {
      try {
        if (rule.condition(event)) {
          console.log(`✅ Rule triggered: ${rule.id}`);

          const action = rule.action(event);

          return {
            rule: rule.id,
            action,
          };
        }
      } catch (err) {
        console.error(`❌ Rule condition error (${rule.id}):`, err);
      }
    }

    return { message: "No rules triggered", event };
  } catch (err) {
    console.error("DecisionEngine error:", err);
    return { error: "Decision engine failure", details: err };
  }
}
