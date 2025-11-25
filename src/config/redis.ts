import { createClient } from "redis";

export const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "redis",
    port: Number(process.env.REDIS_PORT) || 6379,
  }
});

redis.on("error", (err) => console.error("REDIS ERROR:", err));

redis.connect();
