import { Router } from "express";
import supabaseAdmin from "../lib/supabase";

const router = Router();

router.post("/create-room", async (req, res) => {
  try {
    const { home_id, room_name } = req.body;

    const { data, error } = await supabaseAdmin
      .from("rooms")
      .insert({
        home_id,
        name: room_name,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Room created", room: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
