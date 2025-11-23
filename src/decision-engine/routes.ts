// src/decision-engine/routes.ts

import { Router } from "express";
import { DecisionEngine } from "./index";
import { mqttClient } from "../mqtt";

const router = Router();

// Accept suggestion
router.post("/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await DecisionEngine.acceptSuggestion(id);

    // Execute device command over MQTT
    mqttClient.publish(
      `ochiga/device/${result.device_id}/commands`,
      JSON.stringify({
        action: result.action,
        payload: result.payload,
      })
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to accept suggestion" });
  }
});

// Dismiss suggestion
router.post("/:id/dismiss", async (req, res) => {
  try {
    const { id } = req.params;
    await DecisionEngine.dismissSuggestion(id);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to dismiss suggestion" });
  }
});

export default router;
