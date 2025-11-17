// src/server.ts
import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// load envs early
dotenv.config();

import appRouter from "./app"; // central router (see src/app.ts)
import { initMqttBridge } from "./device/bridge";
import { startWorkers } from "./workers/automationWorker";

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// mount API
app.use("/api", appRouter);

// health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const httpServer = http.createServer(app);

export const io = new IOServer(httpServer, {
  cors: { origin: true, credentials: true },
});

// expose io on a small helper so other modules can import
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("subscribe:estate", (estateId: string) => {
    socket.join(`estate:${estateId}`);
  });
  socket.on("unsubscribe:estate", (estateId: string) => {
    socket.leave(`estate:${estateId}`);
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

httpServer.listen(PORT, async () => {
  console.log(`HTTP + WS server listening on port ${PORT}`);
  // initialize MQTT bridge (subscribe to topics)
  try {
    await initMqttBridge();
    console.log("MQTT bridge initialized");
  } catch (err) {
    console.error("MQTT bridge failed to init", err);
  }

  // start worker processes (BullMQ)
  try {
    await startWorkers();
    console.log("Workers started");
  } catch (err) {
    console.error("Workers failed to start", err);
  }
});
