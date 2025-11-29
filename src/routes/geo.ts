// src/routes/geo.ts
import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth"; // fixed import
import { setEstateLocation, updateVisitorLocation } from "../controllers/geoController";

const router = Router();

/**
 * POST /geo/estate/:estateId
 * Estate admins set/update estate coordinates
 */
router.post(
  "/estate/:estateId",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const estateId = req.params.estateId;
      // Pass typed req and res to controller
      return setEstateLocation(req, res);
    } catch (err: any) {
      console.error("Error in /geo/estate route:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /geo/visitor/:visitorId
 * Update live visitor location (may be public)
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

export default router;
