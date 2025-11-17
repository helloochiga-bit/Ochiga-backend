// src/automations/automations.route.ts
import express from "express";
import { supabaseAdmin } from "../supabase/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { nluToAutomation } from "../utils/ai";
import { AutomationSchema, AutomationInputSchema } from "../utils/validation";
import { z } from "zod";

const router = express.Router();

/** POST /automations - create automation (manual) */
router.post("/", requireAuth, requireRole("estate"), async (req: any, res) => {
  try {
    const parsed = AutomationInputSchema.parse(req.body);
    const { data, error } = await supabaseAdmin.from("automations").insert([parsed]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: "Invalid payload" });
  }
});

/** GET /automations?estateId= */
router.get("/", requireAuth, async (req, res) => {
  const estateId = (req.query.estateId as string) || null;
  let q = supabaseAdmin.from("automations").select("*");
  if (estateId) q = q.eq("estate_id", estateId);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** POST /automations/ai-suggest - convert NL -> automation and save (estate role) */
router.post("/ai-suggest", requireAuth, requireRole("estate"), async (req: any, res) => {
  try {
    const { prompt, estateId } = req.body;
    if (!prompt || !estateId) return res.status(400).json({ error: "Missing prompt or estateId" });

    // fetch devices to give context
    const { data: devices } = await supabaseAdmin.from("devices").select("*").eq("estate_id", estateId);

    // call AI NLU
    const suggestion = await nluToAutomation(prompt, devices || []);
    // validate
    const parsed = AutomationSchema.parse({ ...suggestion, estate_id: estateId, ai_generated: true, created_at: new Date().toISOString() });
    // save
    const { data, error } = await supabaseAdmin.from("automations").insert([parsed]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error("ai-suggest error", err);
    return res.status(500).json({ error: "AI or server error" });
  }
});

/** POST /automations/:id/trigger - run manually */
router.post("/:id/trigger", requireAuth, async (req: any, res) => {
  const id = req.params.id;
  // enqueue job for worker — the worker file will expose an enqueue helper
  try {
    const { enqueueAutomation } = await import("../workers/automationWorker");
    await enqueueAutomation(id);
    res.json({ ok: true, message: "Automation enqueued" });
  } catch (err) {
    console.error("trigger error", err);
    res.status(500).json({ error: "Failed to enqueue" });
  }
});

export default router;
