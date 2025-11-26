import app from "./app";
import { PORT, logPortBinding } from "./config/env";

import { startEventProcessor } from "./event-processor/eventProcessor";
import { initRuleEngine } from "./event-processor/rule-engine/rules";

import redis from "./config/redis"; // FIXED IMPORT

// ----------------------------------------------------
// INITIALIZE BACKGROUND SERVICES
// ----------------------------------------------------
(async () => {
  try {
    console.log("⚡ Initializing background services...");

    // Connect Redis
    await redis.connect();

    // Start MQTT Event Processor
    startEventProcessor();

    // Load rule engine into memory
    initRuleEngine();

    console.log("✅ Background services running.");
  } catch (err) {
    console.error("❌ Failed to start background services:", err);
  }
})();

// ----------------------------------------------------
// START EXPRESS SERVER
// ----------------------------------------------------
function startServer(port: number) {
  const server = app.listen(port, () => {
    logPortBinding(port);
  });

  // Only retry ONE TIME if main port is taken
  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} in use. Retrying with a free port...`);

      // Create a NEW SERVER instead of calling listen() again
      startServer(0);
    } else {
      console.error("❌ Server error:", err);
    }
  });
}

startServer(PORT);
