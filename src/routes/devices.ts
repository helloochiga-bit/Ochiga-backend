import express from "express";
import { requireAuth } from "../middleware/auth";
import { Client as SSDPClient } from "node-ssdp";
import mqtt from "mqtt";
import ping from "ping";
import { networkInterfaces } from "os";
import { supabaseAdmin } from "../supabase/client";
import { io } from "../server"; 
import { calculateDistance } from "../utils/geoMath"; // <-- NEW

const router = express.Router();

const DEFAULT_ICON =
  "https://ochiga-assets.s3.amazonaws.com/device/default-device.png";

/* ----------------------------------------------------
 * TYPES
 * ---------------------------------------------------- */
type Device = {
  id: string;
  name: string;
  protocol: string;
  ip: string;
  type?: string;
  status: string;
  icon: string;

  // NEW GEO FIELDS
  latitude?: number;
  longitude?: number;
  installationPoint?: string;
  lastLocationUpdate?: string;
};

/* ----------------------------------------------------
 * GET LOCAL IP
 * ---------------------------------------------------- */
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

/* ----------------------------------------------------
 * PING SWEEP
 * ---------------------------------------------------- */
async function pingSweep(limit = 254): Promise<Device[]> {
  const found: Device[] = [];
  const info = getLocalNetworkInfo();

  if (!info.address) return found;

  const parts = info.address.split(".");
  const base = parts.slice(0, 3).join(".");

  const jobs = [];
  for (let i = 1; i <= limit; i++) {
    const ip = `${base}.${i}`;
    jobs.push(
      ping.promise.probe(ip, { timeout: 2 }).then((res) => {
        if (res.alive) {
          found.push({
            id: ip,
            name: `Device ${ip}`,
            protocol: "ping",
            ip,
            status: "found",
            icon: DEFAULT_ICON,
          });
        }
      })
    );
  }

  await Promise.all(jobs);
  return found;
}

/* ----------------------------------------------------
 * SSDP
 * ---------------------------------------------------- */
async function ssdpDiscover(timeout = 3500): Promise<Device[]> {
  return new Promise((resolve) => {
    const client = new SSDPClient();
    const found: Device[] = [];

    client.on("response", (headers: any, _statusCode: number, rinfo: any) => {
      found.push({
        id: headers.USN || rinfo.address,
        name: headers.SERVER || headers.ST || "SSDP Device",
        protocol: "ssdp",
        ip: rinfo.address,
        port: headers.LOCATION ? new URL(headers.LOCATION).port : undefined,
        type: headers.ST || "unknown",
        status: "found",
        icon: DEFAULT_ICON,
      });
    });

    client.search("ssdp:all");

    setTimeout(() => {
      client.stop();
      resolve(found);
    }, timeout);
  });
}

/* ----------------------------------------------------
 * MQTT DEVICE DISCOVERY
 * ---------------------------------------------------- */
async function mqttDiscover(timeout = 3000): Promise<Device[]> {
  return new Promise((resolve) => {
    const found: Device[] = [];
    const mqttClient = mqtt.connect("mqtt://localhost:1883");

    mqttClient.on("connect", () => {
      mqttClient.subscribe("ochiga/+/device/+/announce", { qos: 1 });
    });

    mqttClient.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        found.push({
          id: data.id,
          name: data.name,
          protocol: "mqtt",
          ip: data.ip || "unknown",
          type: data.type || "device",
          status: "found",
          icon: data.icon || DEFAULT_ICON,
        });
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

/* ----------------------------------------------------
 * MAIN DISCOVERY ROUTE
 * ---------------------------------------------------- */
router.get("/discover", requireAuth, async (req, res) => {
  try {
    console.log("🔍 [DEVICE SCAN] Scan triggered!");

    const ssdp = await ssdpDiscover();
    const mqttResults = await mqttDiscover();
    const pingResults = await pingSweep(80);

    const all: Device[] = [...ssdp, ...mqttResults, ...pingResults];

    if (all.length === 0) {
      console.log("🔍 [DEVICE SCAN] No devices found.");
      return res.status(404).json({ message: "No devices found" });
    }

    console.log(`🔍 [DEVICE SCAN] ${all.length} device(s) discovered:`);
    all.forEach((d) =>
      console.log(
        `- ${d.name} (${d.type || d.protocol}) at ${d.ip} [${d.protocol}]`
      )
    );

    return res.json({ devices: all });
  } catch (err: any) {
    console.error("[DEVICE SCAN] Discovery error:", err);
    return res
      .status(500)
      .json({ error: "Discovery failed", details: err.message });
  }
});

/* ----------------------------------------------------
 * LIST DEVICES IN DB
 * ---------------------------------------------------- */
router.get("/", requireAuth, async (req, res) => {
  const estateId = req.query.estateId as string;

  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("*")
    .eq("estate_id", estateId || null);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ----------------------------------------------------
 * CONNECT DEVICE
 * ---------------------------------------------------- */
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

  console.log(`🔌 [DEVICE CONNECT] Device ${id} connected to estate ${estate_id}`);

  return res.json({ message: "Device connected", device: data });
});

/* ----------------------------------------------------
 * NEW: UPDATE DEVICE LOCATION
 * ---------------------------------------------------- */
router.post("/:deviceId/location", requireAuth, async (req, res) => {
  const { deviceId } = req.params;
  const { lat, lng, installationPoint } = req.body;

  const { data, error } = await supabaseAdmin
    .from("devices")
    .update({
      latitude: lat,
      longitude: lng,
      installationPoint,
      lastLocationUpdate: new Date().toISOString(),
    })
    .eq("id", deviceId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // 🔥 Broadcast live to map
  io.emit("device:location:update", {
    id: deviceId,
    lat,
    lng,
    installationPoint,
  });

  return res.json({
    message: "Location updated",
    device: data,
  });
});

/* ----------------------------------------------------
 * NEW: GET NEARBY DEVICES
 * ---------------------------------------------------- */
router.get("/near", requireAuth, async (req, res) => {
  const { lat, lng, radius = 100 } = req.query;

  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("*");

  if (error) return res.status(500).json({ error: error.message });

  const filtered = data
    .filter((d: any) => d.latitude && d.longitude)
    .map((d: any) => ({
      ...d,
      distance: calculateDistance(
        Number(lat),
        Number(lng),
        d.latitude,
        d.longitude
      ),
    }))
    .filter((d: any) => d.distance <= Number(radius));

  return res.json(filtered);
});

export default router;
