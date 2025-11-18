// src/routes/devices.ts
import express from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { Client as SSDPClient } from "node-ssdp";
import mqtt from "mqtt";

const router = express.Router();

/** GET /devices/discover - discover real IoT devices on local network */
router.get("/discover", requireAuth, async (req, res) => {
  const discoveredDevices: any[] = [];

  // --------- SSDP / UPnP discovery (Smart TVs, IR Hubs) ---------
  const ssdp = new SSDPClient({ explicitSocketBind: true });

  ssdp.on("response", (headers, statusCode, rinfo) => {
    discoveredDevices.push({
      id: headers.USN || rinfo.address,
      name: headers.SERVER || "Unknown Device",
      protocol: "ssdp",
      ip: rinfo.address,
      port: rinfo.port,
    });
  });

  ssdp.search("ssdp:all");

  // Wait 5 seconds for SSDP responses
  await new Promise((resolve) => setTimeout(resolve, 5000));
  ssdp.stop();

  // --------- MQTT discovery (Smart switches, Zigbee gateways, etc) ---------
  const mqttClient = mqtt.connect("mqtt://localhost:1883"); // Replace with your broker
  mqttClient.on("connect", () => {
    mqttClient.subscribe("ochiga/+/device/+/announce", { qos: 1 });
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      discoveredDevices.push({
        id: data.id,
        name: data.name,
        protocol: "mqtt",
        ...data,
      });
    } catch (err) {
      console.warn("Failed to parse MQTT device announcement", err);
    }
  });

  // Wait 5 seconds for MQTT announcements
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      mqttClient.end(true);
      resolve();
    }, 5000);
  });

  if (discoveredDevices.length === 0) {
    return res.status(404).json({ message: "No devices found" });
  }

  res.json({ devices: discoveredDevices });
});

/** GET /devices - list devices */
router.get("/", requireAuth, async (req, res) => {
  const estateId = req.query.estateId as string | undefined;
  const { data, error } = estateId
    ? await supabaseAdmin.from("devices").select("*").eq("estate_id", estateId)
    : await supabaseAdmin.from("devices").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** POST /devices - create device (estate role) */
router.post("/", requireAuth, requireRole("estate"), async (req, res) => {
  const { estate_id, name, type, metadata } = req.body;
  const { data, error } = await supabaseAdmin
    .from("devices")
    .insert([{ estate_id, name, type, metadata }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** POST /devices/:id/action - trigger a device action (placeholder) */
router.post("/:id/action", requireAuth, async (req, res) => {
  const id = req.params.id;
  const { action, params } = req.body;
  // placeholder: in production you will publish to MQTT, push to device gateway API, etc.
  console.log("Trigger device", id, action, params);
  res.json({ ok: true, message: `Action ${action} queued for device ${id}` });
});

export default router;
