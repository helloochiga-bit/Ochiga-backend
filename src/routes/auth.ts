import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// Example: src/routes/auth.ts
import { supabaseAdmin } from "../supabase/supabaseClient"; // fixed path

// Example: src/routes/estates.ts
import { supabaseAdmin } from "../supabase/supabaseClient"; // fixed path

const router = Router();
const APP_JWT_SECRET = process.env.APP_JWT_SECRET!;

// Token signer
function signToken(payload: any) {
  return jwt.sign(payload, APP_JWT_SECRET, { expiresIn: "30d" });
}

// ---------------------- SIGNUP ----------------------
router.post("/signup", async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    const { data: existing, error: existErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existErr) return res.status(500).json({ error: existErr.message });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        full_name,
        password_hash: hash,
        role: "resident"
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const token = signToken({ id: data.id, role: data.role, email: data.email });

    res.json({
      message: "Signup successful",
      user: data,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// ---------------------- LOGIN ----------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user)
      return res.status(400).json({ error: "Invalid email or password" });

    if (!user.password_hash)
      return res.status(400).json({ error: "Account not fully set up" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: "Invalid email or password" });

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      estate_id: user.estate_id,
      home_id: user.home_id,
    });

    res.json({ message: "Login successful", user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
