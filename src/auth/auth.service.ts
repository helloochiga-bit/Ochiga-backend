import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";

export class AuthService {
  async login(data: { usernameOrEmail: string; password: string }) {
    const { usernameOrEmail, password } = data;

    // 1. Find user by email or username
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
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    };
  }
}

export const authService = new AuthService();
