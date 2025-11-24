import express from "express";
import { requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../supabase/client";

const router = express.Router();

/* ---------------------------------------------
   GET ROOMS FOR A HOME
----------------------------------------------*/
router.get("/", requireAuth, async (req, res) => {
  const homeId = req.query.homeId;

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*, room_assignments(*), devices(*)")
    .eq("home_id", homeId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ---------------------------------------------
   CREATE ROOM
----------------------------------------------*/
router.post("/", requireAuth, async (req, res) => {
  const { estate_id, home_id, name, type, ai_profile } = req.body;

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .insert([{ estate_id, home_id, name, type, ai_profile }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Room created", room: data });
});

/* ---------------------------------------------
   UPDATE ROOM AI PROFILE
----------------------------------------------*/
router.put("/ai/:roomId", requireAuth, async (req, res) => {
  const { roomId } = req.params;
  const { ai_profile } = req.body;

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .update({ ai_profile })
    .eq("id", roomId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "AI Profile Updated", room: data });
});

/* ---------------------------------------------
   ASSIGN USER TO ROOM
----------------------------------------------*/
router.post("/assign", requireAuth, async (req, res) => {
  const { room_id, resident_id, role, permissions } = req.body;

  const { data, error } = await supabaseAdmin
    .from("room_assignments")
    .insert([{ room_id, resident_id, role, permissions }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Resident assigned to room", assignment: data });
});

export default router;
