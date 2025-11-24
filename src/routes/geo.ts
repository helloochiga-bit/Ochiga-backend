// src/routes/geo.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { setEstateLocation, updateVisitorLocation } from "../controllers/geoController";

const router = Router();

// estate admins set estate coords
router.post("/estate/:estateId", requireAuth, setEstateLocation);

// visitor live location updates (may be public)
router.post("/visitor/:visitorId", updateVisitorLocation);

export default router;
