import { io } from "../server";
import { supabaseAdmin } from "../supabase/client";

// Send a notification to a user
export async function sendUserNotification(userId: string, payload: any) {
  // Save to DB (optional)
  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    payload,
    read: false,
  });

  // Emit real-time event
  io.to(`user:${userId}`).emit("notification", payload);
}

// Send estate-wide notification
export async function sendEstateNotification(estateId: string, payload: any) {
  io.to(`estate:${estateId}`).emit("notification", payload);
}
