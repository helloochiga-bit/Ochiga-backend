import app from "./app";
import { PORT, logPortBinding } from "./config/env";

// 👉 IMPORT ROUTES
import estatesRoutes from "./routes/estates";
import onboardingRoutes from "./routes/onboarding";

// 👉 REGISTER ROUTES BEFORE SERVER STARTS
app.use("/api/estate", estatesRoutes);       // ✅ matches frontend /api/estate/create-home
app.use("/auth/onboard", onboardingRoutes);  // existing onboarding routes

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
