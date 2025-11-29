// src/routes/notifications.ts
import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth"; // fixed import
import { supabaseAdmin } from "../supabase/supabaseClient"; // fixed path
import { io } from "../server";

const router = express.Router();

// =============================
// GET notifications for a user
// =============================
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id; // non-null assertion since requireAuth ensures user exists

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================
// MARK notification as read
// =============================
router.post("/read/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .update({ status: "read", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================
// CREATE notification (backend events)
// =============================
export async function sendNotification(userId: string, payload: any) {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert([{ ...payload, user_id: userId }])
    .select()
    .single();

  if (!error && data) {
    // Emit real-time event to user
    io.to(`user:${userId}`).emit("notification:new", data);
  }
}

export default router;
