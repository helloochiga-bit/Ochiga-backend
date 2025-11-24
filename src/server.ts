// src/server.ts
import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Load env variables
dotenv.config();

import appRouter from "./app"; // central router
import { initMqttBridge } from "./device/bridge";
import { startWorkers } from "./workers/automationWorker";

const app = express();

// ─── Middleware ───────────────────────────────
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Mount API ───────────────────────────────
app.use("/api", appRouter);

// ─── Health Check ────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── HTTP + WebSocket Server ─────────────────
const httpServer = http.createServer(app);

export const io = new IOServer(httpServer, {
  cors: { origin: true, credentials: true },
});

// Socket.IO — estate-specific and user-specific channels
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Estate subscription
  socket.on("subscribe:estate", (estateId: string) => {
    socket.join(`estate:${estateId}`);
  });

  socket.on("unsubscribe:estate", (estateId: string) => {
    socket.leave(`estate:${estateId}`);
  });

  // User subscription (for real-time notifications)
  socket.on("subscribe:user", (userId: string) => {
    socket.join(`user:${userId}`);
  });

  socket.on("unsubscribe:user", (userId: string) => {
    socket.leave(`user:${userId}`);
  });
});

// ─── Start Server ────────────────────────────
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

httpServer.listen(PORT, async () => {
  console.log(`HTTP + WS server listening on port ${PORT}`);

  // Initialize MQTT bridge
  try {
    await initMqttBridge();
    console.log("MQTT bridge initialized");
  } catch (err) {
    console.error("MQTT bridge failed to initialize", err);
  }

  // Start worker processes (BullMQ)
  try {
    await startWorkers();
    console.log("Workers started");
  } catch (err) {
    console.error("Workers failed to start", err);
  }
});
