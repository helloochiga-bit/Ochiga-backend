import express from "express";
import { supabaseAdmin } from "../supabase/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = express.Router();

/** GET /residents?estateId= - list residents in an estate (estate/admin) */
router.get("/", requireAuth, requireRole("estate"), async (req, res) => {
  const estateId = (req.query.estateId as string) || null;
  let q = supabaseAdmin.from("users").select("id, email, username, role, estate_id, created_at");
  if (estateId) q = q.eq("estate_id", estateId);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** POST /residents - create resident user (estate/admin) */
router.post("/", requireAuth, requireRole("estate"), async (req, res) => {
  const { email, username, role = "resident", estateId } = req.body;
  // create a resident placeholder — in real app send invite link/QR for onboarding
  const { data, error } = await supabaseAdmin.from("users").insert([{ email, username, role, estate_id: estateId }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
