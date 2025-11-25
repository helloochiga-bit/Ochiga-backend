// src/event-processor/decision-engine/index.ts
import { supabaseAdmin as supabase } from "../../supabase/client";
import { io } from "../../server";

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

    // Emit to frontend via Socket.IO
    io.to(suggestion.estateId).emit("suggestion:new", data);

    return data;
  }

  // Accept suggestion
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

  // Dismiss suggestion
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
