// src/event-processor/index.js
/**
 * Oyi Event Processor
 * - Subscribes to MQTT topics and writes normalized events to Supabase.
 * - Immediately triggers local RULE ENGINE (no external forwarding).
 *
 * Run: node src/event-processor/index.js
 */

require("dotenv").config();
const mqtt = require("mqtt");
const pino = require("pino");
const Joi = require("joi");
const { createSupabaseClient } = require("./supabaseClient");

// 🔥 NEW: Local Rule Engine
const { evaluateRules } = require("../rule-engine/engine");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// ------------------------------
// JOI validation for events
// ------------------------------
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
const MQTT_CLIENT_ID =
  process.env.MQTT_CLIENT_ID ||
  `oyi-evt-${Math.random().toString(36).slice(2, 9)}`;

const supabase = createSupabaseClient();

// Topics to subscribe to
const TOPICS = ["ochiga/+/telemetry", "ochiga/+/events", "ochiga/+/state"];

// ----------------------------------------------------
// Extract topic info
// ----------------------------------------------------
function normalizeTopicParts(topic) {
  return topic.split("/");
}

// ----------------------------------------------------
// Insert event into Supabase
// ----------------------------------------------------
async function writeEventToDb(event) {
  try {
    const insert = {
      device_id: event.device_id,
      estate_id: event.estate_id || null,
      type: event.type,
      payload: event.payload,
      ts: event.ts ? new Date(event.ts).toISOString() : new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("device_events")
      .insert(insert)
      .select()
      .limit(1);

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

// ----------------------------------------------------
// Parse MQTT message into normalized event
// ----------------------------------------------------
function parseMessage(topic, messageBuffer) {
  let messageStr = messageBuffer.toString();
  let parsed;

  try {
    parsed = JSON.parse(messageStr);
  } catch {
    parsed = { value: messageStr };
  }

  const parts = normalizeTopicParts(topic);

  let estateId = parsed.estate_id || null;
  let deviceId = parsed.device_id || parsed.id || parsed.device || null;

  if (!estateId && parts[0] === "ochiga" && parts[1]) {
    if (parts[1] !== "device" && parts[1] !== "devices") {
      estateId = parts[1];
    }
  }

  if (!deviceId) {
    const idx = parts.findIndex((p) => p === "device" || p === "devices");
    if (idx !== -1 && parts[idx + 1]) {
      deviceId = parts[idx + 1];
    } else {
      deviceId = parts[parts.length - 2];
    }
  }

  const type = parsed.type || parts[parts.length - 1] || "unknown";

  return {
    device_id: String(deviceId || "unknown"),
    estate_id: estateId,
    type,
    payload: parsed.payload !== undefined ? parsed.payload : parsed,
    ts: parsed.ts || new Date().toISOString(),
  };
}

// ----------------------------------------------------
// Start Event Processor
// ----------------------------------------------------
function start() {
  logger.info(
    { MQTT_URL, clientId: MQTT_CLIENT_ID },
    "Starting Oyi Event Processor"
  );

  const client = mqtt.connect(MQTT_URL, {
    clientId: MQTT_CLIENT_ID,
    reconnectPeriod: 2000,
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
  });

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

      const { error } = await eventSchema
        .validateAsync(event)
        .then(() => ({ error: null }))
        .catch((e) => ({ error: e }));

      if (error) {
        logger.warn(
          { topic, raw: message.toString(), error: error.message },
          "Validation failed — skipping"
        );
        return;
      }

      logger.info(
        { device: event.device_id, estate: event.estate_id, type: event.type },
        "Received event"
      );

      // 1. Save event to DB
      const res = await writeEventToDb(event);

      if (!res.error) {
        // 2. 🔥 Evaluate rules locally (sync automation)
        evaluateRules(event);
      }
    } catch (err) {
      logger.error({ err, topic }, "Failed to process message");
    }
  });

  client.on("close", () => logger.info("MQTT connection closed"));
  client.on("reconnect", () => logger.info("MQTT reconnecting"));
}

start();
