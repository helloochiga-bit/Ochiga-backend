// src/routes/geo.ts
import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";

import {
  setEstateBoundary,
  getEstateBoundary,
  updateVisitorLocation,
  updateDeviceLocation
} from "../controllers/geoController";

const router = Router();

/**
 * POST /geo/estate/:estateId
 * Estate admins set/update estate boundary coordinates
 */
router.post(
  "/estate/:estateId",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      return setEstateBoundary(req, res);
    } catch (err: any) {
      console.error("Error in /geo/estate route:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /geo/estate/:estateId
 * Fetch estate boundary coordinates
 */
router.get(
  "/estate/:estateId",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      return getEstateBoundary(req, res);
    } catch (err: any) {
      console.error("Error in GET /geo/estate route:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /geo/visitor/:visitorId
 * Update live visitor location
 */
router.post(
  "/visitor/:visitorId",
  async (req, res) => {
    try {
      return updateVisitorLocation(req, res);
    } catch (err: any) {
      console.error("Error in /geo/visitor route:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /geo/device/:deviceId
 * Update live device location
 */
router.post(
  "/device/:deviceId",
  requireAuth,
  async (req, res) => {
    try {
      return updateDeviceLocation(req, res);
    } catch (err: any) {
      console.error("Error in /geo/device route:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
