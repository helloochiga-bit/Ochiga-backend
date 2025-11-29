import { Router } from "express";
import bcrypt from "bcrypt";
import { supabaseAdmin } from "../supabase/supabaseClient";

const router = Router();

router.post("/create-home", async (req, res) => {
  try {
    const { estate_id, home_name, owner_email, owner_name } = req.body;

    const tempPassword = Math.random().toString(36).slice(2, 10);
    const hashedPw = await bcrypt.hash(tempPassword, 10);

    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .insert({
        email: owner_email,
        full_name: owner_name,
        role: "resident",
        estate_id,
        password_hash: hashedPw,
      })
      .select()
      .single();

    if (userErr) return res.status(400).json({ error: userErr.message });

    const { data: home, error: homeErr } = await supabaseAdmin
      .from("homes")
      .insert({
        estate_id,
        owner_id: user.id,
        name: home_name,
      })
      .select()
      .single();

    if (homeErr) return res.status(400).json({ error: homeErr.message });

    res.json({
      message: "Home created, owner account created.",
      user,
      home,
      temp_password: tempPassword,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
