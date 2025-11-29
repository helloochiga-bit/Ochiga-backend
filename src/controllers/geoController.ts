// src/controllers/deviceGeoController.ts
import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/client";
import { io } from "../server";
import { calculateDistance } from "../utils/geoMath";
import { notifyUser, NotificationPayload } from "../services/notificationService";

export async function updateDeviceLocation(req: Request, res: Response) {
  try {
    const { deviceId } = req.params;
    const { lat, lng, installationPoint } = req.body;
    if (lat === undefined || lng === undefined) return res.status(400).json({ error: "lat and lng required" });

    const { data, error } = await supabaseAdmin
      .from("devices")
      .update({
        latitude: Number(lat),
        longitude: Number(lng),
        installation_point: installationPoint || null,
        last_location_update: new Date().toISOString(),
        geog: `SRID=4326;POINT(${Number(lng)} ${Number(lat)})`,
      })
      .eq("id", deviceId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    io.emit("device:location:update", { id: deviceId, lat: Number(lat), lng: Number(lng), installationPoint });

    // 🔔 Notify device owner
    if (data?.owner_id) {
      const payload: NotificationPayload = {
        type: "device",
        entityId: deviceId,
        message: `Device ${data.name} location updated.`,
        data: { lat, lng, installationPoint }
      };
      await notifyUser(data.owner_id, payload);
    }

    return res.json({ message: "Device location updated", device: data });
  } catch (err: any) {
    console.error("updateDeviceLocation error", err);
    return res.status(500).json({ error: err.message });
  }
}
