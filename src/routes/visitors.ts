// src/routes/visitors.ts
import { Router } from "express";
import { requireAuth, AuthedRequest } from "./middleware/auth"; // adapt if path differ
import * as VisitorCtrl from "../controllers/visitorController";

const router = Router();

// Create visitor pass (resident)
router.post("/create", requireAuth, VisitorCtrl.createVisitor);

// Get visitor link/status (public)
router.get("/info/:id", VisitorCtrl.getVisitorInfo);

// Verify code or qr (guard)
router.post("/verify", requireAuth, VisitorCtrl.verifyVisitor);

// Approve visitor (guard/manager)
router.post("/approve/:id", requireAuth, VisitorCtrl.approveVisitor);

// Entry / exit hooks (IoT / gate)
router.post("/entry/:id", requireAuth, VisitorCtrl.markEntry);
router.post("/exit/:id", requireAuth, VisitorCtrl.markExit);

// Analytics
router.get("/analytics/estate/:estateId", requireAuth, VisitorCtrl.getAnalyticsForEstate);

export default router;
