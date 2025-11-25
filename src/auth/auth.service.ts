// src/auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabaseAdmin as supabase } from "../supabase/supabaseClient";

interface LoginData {
  usernameOrEmail: string;
  password: string;
}

export class AuthService {
  async login(data: LoginData) {
    const { usernameOrEmail, password } = data;

    // 1. Find user by email or username (NO GENERICS!)
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .or(`email.eq.${usernameOrEmail},username.eq.${usernameOrEmail}`)
      .single();

    if (error || !user) {
      throw new Error("User not found");
    }

    // 2. Validate password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Invalid password");
    }

    // 3. Create JWT token
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error("Missing SUPABASE_JWT_SECRET in environment");
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      secret,
      { expiresIn: "7d" }
    );

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }
}

export const authService = new AuthService();
