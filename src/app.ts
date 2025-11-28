import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth";
import estatesRoutes from "./routes/estates";
import residentsRoutes from "./routes/residents";
import devicesRoutes from "./routes/devices";
import onboardingRoutes from "./routes/onboarding";

const app = express();

// Security headers
app.use(helmet());

// ⭐ FIXED CORS FOR GITHUB CODESPACES ⭐
// Allows ANY `*.github.dev` frontend to reach your backend
app.use(
  cors({
    origin: [
      /\.github\.dev$/,             // Allow all GitHub Codespaces frontends
      "http://localhost:3000",      // Local dev
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Root Route
app.get("/", (req, res) => {
  res.send("🔥 Ochiga Backend API is running");
});

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Ochiga Backend Connected 🔥",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/auth", authRoutes);
app.use("/auth/onboard", onboardingRoutes);
app.use("/estates", estatesRoutes);
app.use("/residents", residentsRoutes);
app.use("/devices", devicesRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl,
  });
});

export default app;
