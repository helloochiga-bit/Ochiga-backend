// src/event-processor/decision-engine/routes.ts
import express from "express";
import { DecisionEngine } from "./index"; // fixed relative import
import { requireAuth } from "../../middleware/auth";

const router = express.Router();

// Accept a suggestion
router.post("/:id/accept", requireAuth, async (req, res) => {
  try {
    const result = await DecisionEngine.acceptSuggestion(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dismiss a suggestion
router.post("/:id/dismiss", requireAuth, async (req, res) => {
  try {
    const result = await DecisionEngine.dismissSuggestion(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
