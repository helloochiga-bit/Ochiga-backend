// src/config/redis.ts
import { createClient } from "redis";

export const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "redis",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});
