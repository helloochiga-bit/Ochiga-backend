// src/routes/devices.ts
import express from "express";
import { requireAuth } from "../middleware/auth";
import { Client as SSDPClient } from "node-ssdp";
import mqtt from "mqtt";
import ping from "ping";
import { networkInterfaces } from "os";
import { supabaseAdmin } from "../supabase/client";

const router = express.Router();

const DEFAULT_ICON =
  "https://ochiga-assets.s3.amazonaws.com/device/default-device.png";

// -------------------------------------------------
// TYPES
// -------------------------------------------------
type Device = {
  id: string;
  name: string;
  supportedProtocols: string[]; // ["mqtt","wifi","zigbee","zwave","ble"]
  currentProtocol: string;
  ip?: string;
  port?: string;
  type?: string;
  status: "found" | "connected" | "offline";
  icon: string;
  signalStrength?: number;
  latency?: number;
  reliability?: number;
};

// -------------------------------------------------
// LOCAL NETWORK INFO
// -------------------------------------------------
function getLocalNetworkInfo() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return { address: net.address };
      }
    }
  }
  return {};
}

// -------------------------------------------------
// CONNECTIVITY SCORING
// -------------------------------------------------
async function evaluateConnectivity(device: Device) {
  const scores: {
    protocol: string;
    signalStrength: number;
    latency: number;
    reliability: number;
    overall: number;
  }[] = [];

  for (const proto of device.supportedProtocols) {
    let signal = 50,
      latencyMs = 50,
      reliability = 80;

    switch (proto) {
      case "wifi":
      case "mqtt":
        if (device.ip) {
          const res = await ping.promise.probe(device.ip, { timeout: 2 });
          signal = res.alive ? 80 : 20;
          latencyMs = res.time || 100;
          reliability = res.alive ? 90 : 20;
        }
        break;
      case "ble":
        signal = Math.floor(Math.random() * 50 + 50);
        latencyMs = Math.floor(Math.random() * 20 + 10);
        reliability = Math.floor(Math.random() * 40 + 60);
        break;
      case "zigbee":
      case "zwave":
        signal = Math.floor(Math.random() * 60 + 40);
        latencyMs = Math.floor(Math.random() * 30 + 20);
        reliability = Math.floor(Math.random() * 50 + 50);
        break;
    }

    scores.push({
      protocol: proto,
      signalStrength: signal,
      latency: latencyMs,
      reliability,
      overall: signal * 0.5 + reliability * 0.3 + (100 - latencyMs) * 0.2,
    });
  }

  // Sort descending by overall score
  scores.sort((a, b) => b.overall - a.overall);

  // Best protocol
  const best = scores[0];
  device.currentProtocol = best.protocol;
  device.signalStrength = best.signalStrength;
  device.latency = best.latency;
  device.reliability = best.reliability;

  return device;
}

// -------------------------------------------------
// PING SWEEP
// -------------------------------------------------
async function pingSweep(limit = 254): Promise<Device[]> {
  const found: Device[] = [];
  const info = getLocalNetworkInfo();

  if (!info.address) return found;

  const parts = info.address.split(".");
  const base = parts.slice(0, 3).join(".");

  const jobs = Array.from({ length: limit }).map(async (_, i) => {
    const ip = `${base}.${i + 1}`;
    const res = await ping.promise.probe(ip, { timeout: 2 });

    if (res.alive) {
      const device: Device = {
        id: ip,
        name: `Device ${ip}`,
        supportedProtocols: ["ping", "wifi", "mqtt"],
        currentProtocol: "ping",
        ip,
        status: "found",
        icon: DEFAULT_ICON,
      };
      found.push(await evaluateConnectivity(device));
    }
  });

  await Promise.all(jobs);
  return found;
}

// -------------------------------------------------
// SSDP DISCOVERY
// -------------------------------------------------
async function ssdpDiscover(timeout = 3500): Promise<Device[]> {
  return new Promise((resolve) => {
    const client = new SSDPClient();
    const found: Device[] = [];

    client.on("response", async (headers: any, _statusCode: number, rinfo: any) => {
      const device: Device = {
        id: headers.USN || rinfo.address,
        name: headers.SERVER || headers.ST || "SSDP Device",
        supportedProtocols: ["ssdp", "wifi", "mqtt"],
        currentProtocol: "ssdp",
        ip: rinfo.address,
        port: headers.LOCATION ? new URL(headers.LOCATION).port : undefined,
        type: headers.ST || "unknown",
        status: "found",
        icon: DEFAULT_ICON,
      };
      found.push(await evaluateConnectivity(device));
    });

    client.search("ssdp:all");

    setTimeout(() => {
      client.stop();
      resolve(found);
    }, timeout);
  });
}

// -------------------------------------------------
// MQTT DISCOVERY
// -------------------------------------------------
async function mqttDiscover(timeout = 3000): Promise<Device[]> {
  return new Promise((resolve) => {
    const found: Device[] = [];
    const mqttClient = mqtt.connect("mqtt://localhost:1883");

    mqttClient.on("connect", () => {
      mqttClient.subscribe("ochiga/+/device/+/announce", { qos: 1 });
    });

    mqttClient.on("message", async (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        const device: Device = {
          id: data.id,
          name: data.name,
          supportedProtocols: ["mqtt", "wifi"],
          currentProtocol: "mqtt",
          ip: data.ip || "unknown",
          type: data.type || "device",
          status: "found",
          icon: data.icon || DEFAULT_ICON,
        };
        found.push(await evaluateConnectivity(device));
      } catch (err) {
        console.warn("MQTT parse error:", err);
      }
    });

    setTimeout(() => {
      mqttClient.end(true);
      resolve(found);
    }, timeout);
  });
}

// -------------------------------------------------
// MAIN DISCOVERY ROUTE
// -------------------------------------------------
router.get("/discover", requireAuth, async (_req, res) => {
  try {
    console.log("🔎 Device discovery started...");

    const ssdp = await ssdpDiscover();
    const mqttResults = await mqttDiscover();
    const pingResults = await pingSweep(80);

    const all: Device[] = [...ssdp, ...mqttResults, ...pingResults];

    if (all.length === 0) {
      console.log("❌ No devices discovered.");
      return res.status(404).json({ message: "No devices found" });
    }

    console.log(`✅ ${all.length} device(s) discovered.`);
    all.forEach((d) =>
      console.log(`→ ${d.name} (${d.currentProtocol}) @ ${d.ip}`)
    );

    res.json({ devices: all });
  } catch (err: any) {
    console.error("[Device Discovery Error]:", err);
    res.status(500).json({
      error: "Discovery failed",
      details: err.message,
    });
  }
});

// -------------------------------------------------
// LIST DEVICES BY ESTATE
// -------------------------------------------------
router.get("/", requireAuth, async (req, res) => {
  const estateId = req.query.estateId as string;

  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("*")
    .eq("estate_id", estateId || null);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// -------------------------------------------------
// CONNECT DEVICE
// -------------------------------------------------
router.post("/connect/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const estate_id = req.query.estateId;

  const { data, error } = await supabaseAdmin
    .from("devices")
    .insert([
      {
        estate_id,
        external_id: id,
        name: `Device ${id}`,
        type: "iot",
        status: "connected",
      },
    ])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  console.log(`🔌 Device ${id} connected to estate ${estate_id}`);

  res.json({ message: "Device connected", device: data });
});

export default router;
