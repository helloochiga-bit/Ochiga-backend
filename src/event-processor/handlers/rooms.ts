import { supabaseAdmin } from "../../supabase/client";
import { io } from "../socket";

export async function handleRoomEvent(event) {
  const { deviceId, type, payload } = event;

  // fetch device → room
  const { data: device } = await supabaseAdmin
    .from("devices")
    .select("*, room_id")
    .eq("external_id", deviceId)
    .single();

  if (!device?.room_id) return;

  // fetch room profile
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", device.room_id)
    .single();

  // AI behaviors
  if (type === "motion_detected") {
    if (room.ai_profile?.auto_lights) {
      io.to(`room:${room.id}`).emit("ai:light:on", {
        roomId: room.id,
        reason: "motion_detected"
      });
    }
  }

  if (type === "user_left") {
    if (room.ai_profile?.energy_save_mode) {
      io.to(`room:${room.id}`).emit("ai:power:save", {
        roomId: room.id
      });
    }
  }
}
