import express from "express";
import { supabaseAdmin } from "../supabase/client";
import bcrypt from "bcrypt";

const router = express.Router();

router.post("/:token", async (req, res) => {
  const token = req.params.token;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }

  // 1️⃣ Check token validity
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from("onboarding_tokens")
    .select("*")
    .eq("token", token)
    .eq("used", false)
    .single();

  if (tokenError || !tokenRow) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const userId = tokenRow.user_id;

  // 2️⃣ Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3️⃣ Update user account
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      username,
      password: hashedPassword,
    })
    .eq("id", userId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  // 4️⃣ Mark token as used
  await supabaseAdmin
    .from("onboarding_tokens")
    .update({ used: true })
    .eq("id", tokenRow.id);

  return res.json({
    message: "Onboarding complete. User activated successfully.",
  });
});

export default router;
