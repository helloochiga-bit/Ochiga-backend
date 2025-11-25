// src/event-processor/decision-engine/db.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

// DB wrapper
export const DecisionEngine = {
  async createSuggestion(suggestion: {
    estate_id: string;
    device_id: string;
    rule_id?: string;
    message: string;
    action: string;
    payload?: any;
    status?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from("suggestions")
        .insert([suggestion])
        .select();

      if (error) throw error;

      console.log("✅ Suggestion saved:", data);
      return data;
    } catch (err) {
      console.error("❌ Failed to save suggestion:", err);
      throw err;
    }
  },
};
