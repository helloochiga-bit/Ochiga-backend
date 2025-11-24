// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Routes
import authRoutes from "./routes/auth";
import estatesRoutes from "./routes/estates";
import residentsRoutes from "./routes/residents";
import devicesRoutes from "./routes/devices";

const app = express();

// ─── Global Middleware ───────────────────────────────
app.use(helmet()); // Security headers
app.use(cors({ origin: true, credentials: true })); // CORS with credentials
app.use(express.json({ limit: "2mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan("dev")); // HTTP request logging

// ─── Health Check ───────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Ochiga Backend Connected 🔥",
    timestamp: new Date().toISOString(),
  });
});

// ─── Mount Routes ───────────────────────────────
app.use("/auth", authRoutes);
app.use("/estates", estatesRoutes);
app.use("/residents", residentsRoutes);
app.use("/devices", devicesRoutes);

// ─── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ─── Global Error Handler ───────────────────────────────
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("🔥 GLOBAL ERROR HANDLER:", err.stack);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: err.message,
    });
  }
);

export default app;
