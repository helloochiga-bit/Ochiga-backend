// src/routes/devices.ts
import express from "express";
import { supabaseAdmin } from "../supabase/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import mqtt from "mqtt";

const router = express.Router();

// MQTT Broker URL (use Mosquitto locally or your broker)
const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const mqttClient = mqtt.connect(MQTT_URL);

const discoveredDevices: any[] = [];

// Listen for device "announce" messages
mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");
  mqttClient.subscribe("ochiga/+/device/+/announce", (err) => {
    if (err) console.error("MQTT subscribe error:", err);
  });
});

mqttClient.on("message", (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    // payload should contain { id, name, protocol }
    const exists = discoveredDevices.find((d) => d.id === payload.id);
    if (!exists) discoveredDevices.push({ ...payload, status: "offline" });
  } catch (err) {
    console.error("Invalid MQTT message:", message.toString());
  }
});

/** GET /devices/discover - discover devices dynamically */
router.get("/discover", requireAuth, async (req, res) => {
  try {
    // fetch registered devices
    const { data: registeredDevices } = await supabaseAdmin.from("devices").select("*");

    // merge registered & discovered devices
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

/** POST /devices/:id/action - trigger a device action via MQTT */
router.post("/:id/action", requireAuth, async (req, res) => {
  const id = req.params.id;
  const { action, params, topic } = req.body;

  // Find device topic
  const deviceTopic = topic || `ochiga/+/device/${id}/set`;

  mqttClient.publish(deviceTopic, JSON.stringify({ action, params }), { qos: 1 }, (err) => {
    if (err) return res.status(500).json({ ok: false, message: err.message });
    res.json({ ok: true, message: `Action ${action} sent to device ${id}` });
  });
});

export default router;
