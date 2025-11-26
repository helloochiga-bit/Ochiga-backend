// src/event-processor/handlers/rooms.ts
import { supabaseAdmin } from "../../supabase/client";
import { io } from "../../server";  // ✅ FIXED PATH

export interface RoomEvent {
  deviceId: string;
  type: "motion_detected" | "user_left" | string;
  payload?: any;
}

export async function handleRoomEvent(event: RoomEvent) {
  const { deviceId, type } = event;

  // Get device → must have room_id
  const { data: device, error: deviceError } = await supabaseAdmin
    .from("devices")
    .select("id, external_id, room_id")
    .eq("external_id", deviceId)
    .single();

  if (deviceError || !device?.room_id) return;

  // Fetch the room + AI profile
  const { data: room, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", device.room_id)
    .single();

  if (roomError || !room) return;

  // ⚡ Handle Motion Events
  if (type === "motion_detected" && room.ai_profile?.auto_lights) {
    io.to(`room:${room.id}`).emit("ai:light:on", {
      roomId: room.id,
      reason: "motion_detected",
    });
  }

  // ⚡ Handle User Leaving
  if (type === "user_left" && room.ai_profile?.energy_save_mode) {
    io.to(`room:${room.id}`).emit("ai:power:save", {
      roomId: room.id,
    });
  }
}
