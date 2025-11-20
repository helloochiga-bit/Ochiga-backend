// src/index.ts
import app from "./app";
import { PORT, logPortBinding } from "./config/env";

// ─── IMPORT ROUTES ─────────────────────────
import estatesRoutes from "./routes/estates";
import onboardingRoutes from "./routes/onboarding";

// ─── REGISTER ROUTES ───────────────────────
app.use("/api/estates", estatesRoutes);       // ✅ create-home route is here
app.use("/auth/onboard", onboardingRoutes);   // onboarding route

// ─── START SERVER ──────────────────────────
const server = app.listen(PORT, () => {
  logPortBinding(PORT);
});

// ─── HANDLE PORT CONFLICTS ─────────────────
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
