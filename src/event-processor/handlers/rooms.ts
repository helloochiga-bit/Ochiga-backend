import { supabaseAdmin } from "../../supabase/client";
import { io } from "../socket";

// Strongly type the incoming event
export interface RoomEvent {
  deviceId: string;
  type: "motion_detected" | "user_left" | string;
  payload?: any;
}

export async function handleRoomEvent(event: RoomEvent) {
  const { deviceId, type } = event;

  // Fetch device → room
  const { data: device, error: deviceError } = await supabaseAdmin
    .from("devices")
    .select("*, room_id")
    .eq("external_id", deviceId)
    .single();

  if (deviceError || !device?.room_id) {
    console.warn("Device or room not found for event:", event);
    return;
  }

  // Fetch room profile
  const { data: room, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", device.room_id)
    .single();

  if (roomError || !room) {
    console.warn("Room not found for device:", deviceId);
    return;
  }

  // AI behaviors
  if (type === "motion_detected" && room.ai_profile?.auto_lights) {
    io.to(`room:${room.id}`).emit("ai:light:on", {
      roomId: room.id,
      reason: "motion_detected",
    });
  }

  if (type === "user_left" && room.ai_profile?.energy_save_mode) {
    io.to(`room:${room.id}`).emit("ai:power:save", {
      roomId: room.id,
    });
  }
}
