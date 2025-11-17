import express from "express";
import { supabaseAdmin } from "../supabase/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = express.Router();

/** GET /estates - list (admin/estate) */
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from("estates").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** POST /estates - create estate (estate role or admin) */
router.post("/", requireAuth, requireRole("estate"), async (req, res) => {
  const { name, address } = req.body;
  const { data, error } = await supabaseAdmin.from("estates").insert([{ name, address }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** GET /estates/:id */
router.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const { data, error } = await supabaseAdmin.from("estates").select("*").eq("id", id).single();
  if (error) return res.status(404).json({ error: "Not found" });
  res.json(data);
});

export default router;
