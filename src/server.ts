// src/server.ts
import http from "http";
import { Server as IOServer } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

// EXPRESS APP
import app from "./app";

// ENV + PORT CONFIG
import { PORT } from "./config/env";

// BACKGROUND SERVICES
import { redis } from "./config/redis";
import { startEventProcessor } from "./event-processor/eventProcessor";
import { initRuleEngine } from "./event-processor/rule-engine/rules";

// MQTT BRIDGE
import { initMqttBridge } from "./device/bridge";

// WORKERS
import { startWorkers } from "./workers/automationWorker";

// ---------------------------
// HTTP + WEBSOCKET SERVER
// ---------------------------
const httpServer = http.createServer(app);

export const io = new IOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// Socket.io Connection
io.on("connection", (socket) => {
  console.log("Socket connected →", socket.id);

  socket.on("subscribe:estate", (estateId: string) => {
    socket.join(`estate:${estateId}`);
  });

  socket.on("subscribe:user", (userId: string) => {
    socket.join(`user:${userId}`);
  });
});

// ---------------------------
// START SERVER + SERVICES
// ---------------------------
httpServer.listen(PORT, async () => {
  console.log(`🚀 HTTP + WebSocket server running on port ${PORT}`);

  // Connect Redis
  try {
    await redis.connect();
    console.log("🟢 Redis connected");
  } catch (error) {
    console.error("🔴 Redis connection failed →", error);
  }

  // Start MQTT Event Processor
  try {
    startEventProcessor(); // no await → non-blocking
    console.log("🟢 Event processor started");
  } catch (error) {
    console.error("🔴 Event processor failed →", error);
  }

  // Load Rule Engine
  try {
    initRuleEngine();
    console.log("🟢 Rule engine initialized");
  } catch (error) {
    console.error("🔴 Rule engine failed →", error);
  }

  // Start MQTT Bridge
  try {
    await initMqttBridge();
    console.log("🟢 MQTT bridge initialized");
  } catch (error) {
    console.error("🔴 MQTT bridge failed →", error);
  }

  // Start BullMQ Workers
  try {
    await startWorkers();
    console.log("🟢 Workers started");
  } catch (error) {
    console.error("🔴 Worker startup failed →", error);
  }
});
