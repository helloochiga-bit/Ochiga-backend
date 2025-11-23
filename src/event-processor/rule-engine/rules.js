/**
 * Rule definitions for the Ochiga Smart Estate System
 * Each rule gets the event and state/context (if needed)
 */

export const rules = [

  // -------------------------------------------------------------
  // 1. Auto-Lights Off At Night (Estate-Level Automation)
  // -------------------------------------------------------------
  {
    id: "night_auto_lights_off",
    description: "Turn off lights automatically if motion stops at night",
    condition: (event) => {
      if (event.event_type !== "motion_detected") return false;

      const hour = new Date().getHours();
      const isNight = hour >= 23 || hour <= 5;

      return isNight && event.data?.motion === false;
    },
    action: (event) => ({
      type: "device_command",
      device_id: "light-01",
      command: { power: "off" },
      priority: "high",
      source_rule: "night_auto_lights_off",
    }),
  },

  // -------------------------------------------------------------
  // 2. Notify resident of suspicious motion (Resident-Level)
  // -------------------------------------------------------------
  {
    id: "suspicious_motion_alert",
    description: "If motion is detected outside the door after midnight, alert resident",
    condition: (event) => {
      if (event.event_type !== "motion_detected") return false;

      const hour = new Date().getHours();
      const late = hour >= 0 && hour <= 4;
      const outside = event.data?.location === "door";

      return late && outside && event.data?.motion === true;
    },
    action: (event) => ({
      type: "suggestion",
      target_user: event.data?.user_id,
      title: "Late Night Motion Detected",
      message: "We detected movement near your door. Would you like to view your camera?",
      suggestion_type: "security_alert",
      metadata: {
        device_id: event.device_id,
        rule_triggered: "suspicious_motion_alert"
      }
    }),
  },

  // -------------------------------------------------------------
  // 3. Auto start generator if power goes off
  // -------------------------------------------------------------
  {
    id: "auto_start_generator",
    description: "If power grid goes down, start generator",
    condition: (event) => {
      return event.event_type === "power_state" && event.data?.grid === "off";
    },
    action: () => ({
      type: "device_command",
      device_id: "generator-01",
      command: { start: true },
      priority: "highest",
      source_rule: "auto_start_generator",
    }),
  },
];
