import { Router } from "express";
import bcrypt from "bcrypt";
import supabaseAdmin from "../lib/supabase";

const router = Router();

router.post("/complete", async (req, res) => {
  try {
    const { user_id, username, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        username,
        password_hash: hashedPassword,
        onboarding_complete: true,
      })
      .eq("id", user_id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Onboarding complete", user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
