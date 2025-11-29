// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// ROUTES
import authRoutes from "./routes/auth";
import estatesRoutes from "./routes/estates";
import residentsRoutes from "./routes/residents";
import devicesRoutes from "./routes/devices";
import onboardingRoutes from "./routes/onboarding";
import visitorRoutes from "./routes/visitors"; // <-- NEW Visitor Access 2.0

const app = express();

// Security Middleware
app.use(helmet());

// -------------------------------
// ⭐ FIXED CORS FOR CODESPACES
// -------------------------------
app.use(
  cors({
    origin: [
      "https://crispy-succotash-x5799wg49j5qhpxx6-3000.app.github.dev",
      /\.(github|githubusercontent)\.dev$/,
      "http://localhost:3000"
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

// -------------------------------
// Mount Routes
// -------------------------------
app.use("/auth", authRoutes);
app.use("/auth/onboard", onboardingRoutes);
app.use("/estates", estatesRoutes);
app.use("/residents", residentsRoutes);
app.use("/devices", devicesRoutes);
app.use("/visitors", visitorRoutes); // <-- NEW

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl,
  });
});

export default app;
