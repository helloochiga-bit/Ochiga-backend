// src/index.ts
import app from "./app";
import { PORT, logPortBinding } from "./config/env";

import { startEventProcessor } from "./event-processor/eventProcessor";
import { initRuleEngine } from "./event-processor/rule-engine/rules";

import { redis } from "./config/redis";

// ----------------------------------------------------
// INITIALIZE BACKGROUND SERVICES
// ----------------------------------------------------
(async () => {
  try {
    console.log("⚡ Initializing background services...");

    // Connect to Redis
    await redis.connect();

    // Start MQTT event processor (non-blocking)
    startEventProcessor();

    // Load rule engine
    initRuleEngine();

    console.log("✅ Background services running.");
  } catch (err) {
    console.error("❌ Failed to start background services:", err);
  }
})();

// ----------------------------------------------------
// START EXPRESS SERVER
// ----------------------------------------------------
const server = app.listen(PORT, () => {
  logPortBinding(PORT);
});

// Handle port conflicts
server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`⚠️ Port ${PORT} is in use. Trying a new port...`);

    const newServer = app.listen(0, () => {
      const actualPort = (newServer.address() as any).port;
      logPortBinding(actualPort);
    });

  } else {
    console.error("Server error:", err);
  }
});
