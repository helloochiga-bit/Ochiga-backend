// src/event-processor/socket.ts
import { Server } from "socket.io";

export const io = new Server({
  cors: { origin: "*" }, // optional
});
