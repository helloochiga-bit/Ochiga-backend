// src/event-processor/index.js
/**
 * Oyi Event Processor
 * - Subscribes to MQTT topics and writes normalized events to Supabase.
 * - Optionally forwards events to RULE_ENGINE_URL for rule processing.
 *
 * Run: node src/event-processor/index.js
 */

require("dotenv").config();
const mqtt = require("mqtt");
const pino = require("pino");
const Joi = require("joi");
const axios = require("axios");
const { createSupabaseClient } = require("./supabaseClient");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// Validate event payload shape
const eventSchema = Joi.object({
  device_id: Joi.string().required(),
  estate_id: Joi.string().allow(null, ""),
  type: Joi.string().required(),
  payload: Joi.any().required(),
  ts: Joi.date().iso().optional(),
});

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || `oyi-evt-${Math.random().toString(36).slice(2,9)}`;

const RULE_ENGINE_URL = process.env.RULE_ENGINE_URL || null;

const supabase = createSupabaseClient();

// Topics to subscribe to - customize with your device topic pattern
const TOPICS = [
  "ochiga/+/telemetry",
  "ochiga/+/events",
  "ochiga/+/state",
];

function normalizeTopicParts(topic) {
  // topic -> e.g. ochiga/<estateId>/devices/<deviceId>/telemetry
  // we keep simple: try to extract estate & device from topic segments if present
  const parts = topic.split("/");
  return parts;
}

async function writeEventToDb(event) {
  try {
    const insert = {
      device_id: event.device_id,
      estate_id: event.estate_id || null,
      type: event.type,
      payload: event.payload,
      ts: event.ts ? new Date(event.ts).toISOString() : new Date().toISOString(),
    };

    const { data, error } = await supabase.from("device_events").insert(insert).select().limit(1);
    if (error) {
      logger.error({ err: error }, "Supabase insert error");
      return { error };
    }
    logger.debug({ inserted: data }, "Inserted event into device_events");
    return { ok: true, data };
  } catch (err) {
    logger.error({ err }, "writeEventToDb failed");
    return { error: err };
  }
}

async function forwardToRuleEngine(payload) {
  if (!RULE_ENGINE_URL) return;
  try {
    await axios.post(RULE_ENGINE_URL, payload, { timeout: 5000 });
    logger.debug("Forwarded to rule engine");
  } catch (err) {
    logger.warn({ err: err.message }, "Failed to forward to rule engine");
  }
}

function parseMessage(topic, messageBuffer) {
  let messageStr = messageBuffer.toString();
  let parsed = null;
  try {
    parsed = JSON.parse(messageStr);
  } catch {
    // not JSON — treat as raw value
    parsed = { value: messageStr };
  }

  // Try to populate device_id / estate_id if missing using topic segments
  // Topic patterns vary — you can adjust mapping here.
  const parts = normalizeTopicParts(topic);

  // example heuristics:
  // ochiga/<estateId>/device/<deviceId>/telemetry
  // or ochiga/device/<deviceId>/telemetry
  let estateId = parsed.estate_id || null;
  let deviceId = parsed.device_id || parsed.id || parsed.device || null;

  // heuristics to get from topic pieces
  // if topic looks like ["ochiga", "<estate>", "device", "<device>", "telemetry"]
  if (!estateId && parts.length >= 2 && parts[0] === "ochiga") {
    // pick parts[1] if not 'device'
    if (parts[1] !== "device" && parts[1] !== "devices") estateId = parts[1];
  }
  if (!deviceId) {
    const deviceIdx = parts.findIndex((p) => p === "device" || p === "devices");
    if (deviceIdx !== -1 && parts.length > deviceIdx + 1) {
      deviceId = parts[deviceIdx + 1];
    } else {
      // fallback: last part before topic type
      if (parts.length >= 2) deviceId = parts[parts.length - 2];
    }
  }

  const type = parsed.type || (parts[parts.length - 1] || "unknown");

  const event = {
    device_id: String(deviceId || "unknown"),
    estate_id: estateId || null,
    type,
    payload: parsed.payload !== undefined ? parsed.payload : parsed,
    ts: parsed.ts || new Date().toISOString(),
  };

  return event;
}

function start() {
  logger.info({ MQTT_URL, clientId: MQTT_CLIENT_ID }, "Starting Oyi Event Processor");

  const options = {
    clientId: MQTT_CLIENT_ID,
    reconnectPeriod: 2000,
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
  };

  const client = mqtt.connect(MQTT_URL, options);

  client.on("connect", () => {
    logger.info("Connected to MQTT broker");
    TOPICS.forEach((t) => {
      client.subscribe(t, { qos: 1 }, (err) => {
        if (err) logger.error({ err, topic: t }, "Subscribe failed");
        else logger.info({ topic: t }, "Subscribed to topic");
      });
    });
  });

  client.on("error", (err) => {
    logger.error({ err }, "MQTT error");
  });

  client.on("message", async (topic, message) => {
    try {
      const event = parseMessage(topic, message);
      const { error } = await eventSchema.validateAsync(event).then((v) => ({ value: v })).catch((e) => ({ error: e }));
      if (error) {
        logger.warn({ topic, raw: message.toString(), error: error.message }, "Validation failed — skipping");
        return;
      }

      logger.info({ device: event.device_id, estate: event.estate_id, type: event.type }, "Received event");

      // write to DB
      const res = await writeEventToDb(event);
      if (!res.error) {
        // optionally forward to rule engine
        forwardToRuleEngine(event).catch((e) => logger.warn({ e }, "forwardToRuleEngine error"));
      }
    } catch (err) {
      logger.error({ err, topic }, "Failed to process message");
    }
  });

  client.on("close", () => logger.info("MQTT connection closed"));
  client.on("reconnect", () => logger.info("MQTT reconnecting"));
}

start();
