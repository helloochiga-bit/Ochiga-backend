// src/decision-engine/index.ts
/**
 * Oyi Decision Engine
 * - Stores rule suggestions
 * - Emits them to clients via Socket.io
 * - Handles user Accept / Dismiss action
 */

import { supabaseAdmin as supabase } from "../supabase/supabaseClient";
import { io } from "../server";

// -----------------------------
// TYPES
// -----------------------------
export interface SuggestionPayload {
  [key: string]: any;
}

export interface SuggestionInput {
  estate_id: string;
  device_id: string;
  rule_id: string;
  message: string;
  action?: string;
  payload?: SuggestionPayload;
}

export interface SuggestionData extends SuggestionInput {
  id: string;
  status: "pending" | "accepted" | "dismissed";
  resolved_at?: string;
}

// -----------------------------
// DECISION ENGINE
// -----------------------------
export class DecisionEngine {
  /**
   * Creates a suggestion
   */
  static async createSuggestion({
    estate_id,
    device_id,
    rule_id,
    message,
    action,
    payload,
  }: SuggestionInput): Promise<SuggestionData> {
    const insert: SuggestionInput & { status: "pending" } = {
      estate_id,
      device_id,
      rule_id,
      message,
      action,
      payload,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("suggestions")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;

    // Emit to frontend (estate or resident dashboard)
    io.to(estate_id).emit("suggestion:new", data);

    return data;
  }

  /**
   * User accepts the suggestion → perform action
   */
  static async acceptSuggestion(id: string): Promise<{
    ok: true;
    action?: string;
    payload?: SuggestionPayload;
    device_id: string;
  }> {
    const { data: suggestion, error: fetchErr } = await supabase
      .from("suggestions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    // Update status
    await supabase
      .from("suggestions")
      .update({
        status: "accepted",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Emit status update
    io.to(suggestion.estate_id).emit("suggestion:update", {
      id,
      status: "accepted",
    });

    return {
      ok: true,
      action: suggestion.action,
      payload: suggestion.payload,
      device_id: suggestion.device_id,
    };
  }

  /**
   * Dismiss a suggestion
   */
  static async dismissSuggestion(id: string): Promise<{ ok: true }> {
    const { data: suggestion } = await supabase
      .from("suggestions")
      .select("*")
      .eq("id", id)
      .single();

    await supabase
      .from("suggestions")
      .update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Emit status update
    io.to(suggestion.estate_id).emit("suggestion:update", {
      id,
      status: "dismissed",
    });

    return { ok: true };
  }
}
