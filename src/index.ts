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

    // Start MQTT event processor (NO await — do not block)
    startEventProcessor();

    // Load rule engine rules into memory
    initRuleEngine();

    console.log("✅ Background services running.");
  } catch (err) {
    console.error("❌ Failed to start background services:", err);
  }
})();

// ----------------------------------------------------
// START EXPRESS SERVER (NO FALLBACK PORT LOGIC)
// ----------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  logPortBinding(PORT);
});
