import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabaseAdmin as supabase } from "../supabase/supabaseClient"; // fixed import

interface LoginData {
  usernameOrEmail: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  username?: string | null;
  password: string;
}

export class AuthService {
  async login(data: LoginData) {
    const { usernameOrEmail, password } = data;

    // 1. Find user by email or username
    const { data: user, error } = await supabase
      .from<User>("users")
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
    if (!process.env.SUPABASE_JWT_SECRET) {
      throw new Error("JWT secret not set");
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      process.env.SUPABASE_JWT_SECRET,
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

// Export singleton
export const authService = new AuthService();
