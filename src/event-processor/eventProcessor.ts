// src/event-processor/eventProcessor.ts

export interface Event {
  deviceId: string;
  type: string;
  payload: any;
  timestamp?: Date;
}

export interface Suggestion {
  estateId: string;
  deviceId: string;
  ruleId?: string;
  message: string;
  action: "turn_off" | "dim_light" | "lock_door";
  payload?: any;
  status?: "pending" | "accepted" | "dismissed" | "executed";
}

// Temporary stub function — replace later with real AI logic
export function processEvent(event: Event): Suggestion | null {
  console.log("Processing event:", event);

  // Example placeholder decision
  return {
    estateId: "placeholder-uuid",
    deviceId: event.deviceId,
    message: `AI suggests taking action for ${event.type}`,
    action: "turn_off",
    status: "pending",
    payload: {},
  };
}
