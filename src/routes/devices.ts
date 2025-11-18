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

  // Wait 2 seconds for SSDP responses
  await new Promise((resolve) => setTimeout(resolve, 2000));

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

  // Wait 2 seconds for MQTT announcements
  await new Promise((resolve) => setTimeout(resolve, 2000));
  mqttClient.end(true);

  if (discoveredDevices.length === 0) {
    return res.status(404).json({ message: "No devices found" });
  }

  res.json({ devices: discoveredDevices });
});

export default router;
