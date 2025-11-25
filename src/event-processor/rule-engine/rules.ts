// src/event-processor/rule-engine/rules.ts
export interface EventPayload {
  event_type: string;
  deviceId: string;
  data?: any;
}

export interface Rule {
  id: string;
  description: string;
  condition: (event: EventPayload) => boolean;
  action: (event: EventPayload) => any;
}

export const rules: Rule[] = [
  {
    id: "night_auto_lights_off",
    description: "Turn off lights automatically if motion stops at night",
    condition: (event) => {
      if (event.event_type !== "motion_detected") return false;
      const hour = new Date().getHours();
      const isNight = hour >= 23 || hour <= 5;
      return isNight && event.data?.motion === false;
    },
    action: () => ({
      type: "device_command",
      device_id: "light-01",
      command: { power: "off" },
      priority: "high",
      source_rule: "night_auto_lights_off",
    }),
  },
  {
    id: "suspicious_motion_alert",
    description: "Alert user if motion outside the door after midnight",
    condition: (event) => {
      if (event.event_type !== "motion_detected") return false;
      const hour = new Date().getHours();
      const late = hour >= 0 && hour <= 4;
      return late && event.data?.location === "door" && event.data?.motion === true;
    },
    action: (event) => ({
      type: "suggestion",
      message: "Late night motion detected at your door",
      target_user: event.data?.user_id,
      metadata: { device_id: event.deviceId, rule_triggered: "suspicious_motion_alert" },
    }),
  },
  {
    id: "auto_start_generator",
    description: "Start generator when grid power goes off",
    condition: (event) => event.event_type === "power_state" && event.data?.grid === "off",
    action: () => ({
      type: "device_command",
      device_id: "generator-01",
      command: { start: true },
      priority: "highest",
      source_rule: "auto_start_generator",
    }),
  },
];

export function initRuleEngine() {
  console.log(`✅ Rule Engine initialized with ${rules.length} rules`);
}
