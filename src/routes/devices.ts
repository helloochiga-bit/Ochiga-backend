// src/routes/devices.ts
import express from "express";
import { supabaseAdmin } from "../supabase/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = express.Router();

/** GET /devices?estateId= - list devices */
router.get("/", requireAuth, async (req, res) => {
  const estateId = req.query.estateId as string | undefined;

  try {
    const { data, error } = estateId
      ? await supabaseAdmin.from("devices").select("*").eq("estate_id", estateId)
      : await supabaseAdmin.from("devices").select("*");

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /devices/discover - discover devices dynamically */
router.get("/discover", requireAuth, async (req, res) => {
  try {
    // ----- PLACEHOLDER: Replace this block with real network scan or MQTT/Zigbee discovery -----
    // For demo purposes, we simulate discovered devices
    const discoveredDevices = [
      { id: "1", name: "Living Room Light", protocol: "wifi", status: "offline", aiSummary: "Smart light in living room" },
      { id: "2", name: "Thermostat", protocol: "zigbee", status: "offline", aiSummary: "Smart thermostat device" },
    ];

    // Fetch registered devices from database
    const { data: registeredDevices, error } = await supabaseAdmin.from("devices").select("*");
    if (error) console.warn("Error fetching registered devices:", error.message);

    // Map registered devices to mark status
    const devices = discoveredDevices.map((dev) => {
      const registered = registeredDevices?.find((d: any) => d.name.toLowerCase() === dev.name.toLowerCase());
      return {
        ...dev,
        status: registered ? "connected" : dev.status,
        id: registered?.id || dev.id,
      };
    });

    res.json({ devices });
  } catch (err: any) {
    console.error("Device discovery error:", err);
    res.status(500).json({ message: err.message || "Device discovery failed" });
  }
});

/** POST /devices - create device (estate role) */
router.post("/", requireAuth, requireRole("estate"), async (req, res) => {
  const { estate_id, name, type, metadata } = req.body;
  try {
    const { data, error } = await supabaseAdmin.from("devices").insert([{ estate_id, name, type, metadata }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /devices/:id/action - trigger a device action */
router.post("/:id/action", requireAuth, async (req, res) => {
  const id = req.params.id;
  const { action, params } = req.body;
  console.log("Trigger device", id, action, params);

  // ----- PLACEHOLDER: Replace with actual device command (MQTT publish, API call, etc.) -----
  res.json({ ok: true, message: `Action ${action} queued for device ${id}` });
});

export default router;
