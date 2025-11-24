import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { updateDeviceLocation, getDevicesNearPoint } from "../controllers/deviceGeoController";

const router = Router();

// device installs or updates location
router.post("/:deviceId/update", requireAuth, updateDeviceLocation);

// query all devices around a coordinate
router.get("/near", requireAuth, getDevicesNearPoint);

export default router;
