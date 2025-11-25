// src/event-processor/decision-engine/index.ts
import { supabaseAdmin as supabase } from "../../supabase/client";
import { io } from "../../server";

// Event type for rules
export interface Event {
  deviceId: string;
  eventType: string;
  payload: any;
  timestamp?: Date;
}

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

// DecisionEngine class
export class DecisionEngine {
  // Create suggestion
  static async createSuggestion(suggestion: Suggestion) {
    const { data, error } = await supabase
      .from("suggestions")
      .insert([suggestion])
      .select()
      .single();

    if (error) throw error;

    io.to(suggestion.estateId).emit("suggestion:new", data);
    return data;
  }

  static async acceptSuggestion(id: string) {
    const { data: suggestion, error: fetchErr } = await supabase
      .from("suggestions")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    await supabase
      .from("suggestions")
      .update({ status: "accepted", resolved_at: new Date().toISOString() })
      .eq("id", id);

    io.to(suggestion.estateId).emit("suggestion:update", { id, status: "accepted" });

    return { ok: true, action: suggestion.action, payload: suggestion.payload, deviceId: suggestion.deviceId };
  }

  static async dismissSuggestion(id: string) {
    const { data: suggestion } = await supabase
      .from("suggestions")
      .select("*")
      .eq("id", id)
      .single();

    await supabase
      .from("suggestions")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("id", id);

    io.to(suggestion.estateId).emit("suggestion:update", { id, status: "dismissed" });

    return { ok: true };
  }
}

// Example simple rule evaluation function
export function evaluateEvent(event: Event): Suggestion | null {
  // Dummy example: if motion detected, create notify suggestion
  if (event.eventType === "motion_detected") {
    return {
      estateId: "default_estate",
      deviceId: event.deviceId,
      message: "Motion detected",
      action: "notify",
      status: "pending",
    };
  }
  return null;
}

// EventPayload type (alias to Event for clarity)
export type EventPayload = Event;
