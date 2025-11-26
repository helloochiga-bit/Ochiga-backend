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

    await redis.connect(); // <--- FIXED

    await startEventProcessor();
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

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`⚠️ Port ${PORT} is in use. Attempting to bind to a random free port...`);

    server.listen(0, () => {
      const actualPort = (server.address() as any).port;
      logPortBinding(actualPort);
    });
  } else {
    console.error(err);
  }
});
