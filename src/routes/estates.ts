import { Router } from "express";
import bcrypt from "bcrypt";
import { supabaseAdmin } from "../supabase/supabaseClient";

const router = Router();

/**
 * Create a Home + Create Owner Account (Resident)
 */
router.post("/create-home", async (req, res) => {
  try {
    const {
      estate_id,
      home_name,
      owner_email,
      owner_username,
      phone_number
    } = req.body;

    if (!estate_id || !home_name || !owner_email || !owner_username) {
      return res.status(400).json({
        error: "estate_id, home_name, owner_email, owner_username are required"
      });
    }

    const tempPassword = Math.random().toString(36).slice(2, 10);
    const hashedPw = await bcrypt.hash(tempPassword, 10);

    // 1. Create user
    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .insert({
        email: owner_email,
        username: owner_username,
        phone_number,
        password: hashedPw,
        role: "resident",
        estate_id
      })
      .select()
      .single();

    if (userErr) {
      return res.status(400).json({ error: userErr.message });
    }

    // 2. Create home
    const { data: home, error: homeErr } = await supabaseAdmin
      .from("homes")
      .insert({
        estate_id,
        resident_id: user.id,
        name: home_name
      })
      .select()
      .single();

    if (homeErr) {
      return res.status(400).json({ error: homeErr.message });
    }

    return res.json({
      message: "Home + Resident created successfully",
      user,
      home,
      temp_password: tempPassword
    });
  } catch (err) {
    console.error("Create Home Error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
