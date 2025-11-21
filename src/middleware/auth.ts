// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthedRequest = Request & {
  user?: { id: string; role: string; email?: string };
};

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
if (!SUPABASE_JWT_SECRET) {
  throw new Error("Missing SUPABASE_JWT_SECRET in environment");
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {

  // 🔥 STEP 2 — DEBUG LOG: SEE EXACT HEADERS BACKEND IS RECEIVING
  console.log("🔥 Incoming request headers:", req.headers);

  const auth = req.headers.authorization;
  if (!auth) {
    console.log("❌ No Authorization header found");
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const parts = auth.split(" ");
  if (parts.length !== 2) {
    console.log("❌ Invalid Authorization header format:", auth);
    return res.status(401).json({ error: "Invalid authorization header" });
  }

  const token = parts[1];

  try {
    // Verify Supabase JWT
    const payload: any = jwt.verify(token, SUPABASE_JWT_SECRET);

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role || "resident", // default role fallback
    };

    console.log("✅ JWT Verified Successfully:", req.user);

    next();
  } catch (err: any) {
    console.error("❌ JWT verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
