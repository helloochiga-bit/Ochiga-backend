// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export type AuthedRequest = Request & {
  user?: { id: string; role: string; email?: string };
};

// ✅ Assert JWT secret exists
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;
if (!SUPABASE_JWT_SECRET) {
  throw new Error("Missing SUPABASE_JWT_SECRET in environment");
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing authorization header" });

  const parts = auth.split(" ");
  if (parts.length !== 2) return res.status(401).json({ error: "Invalid authorization header" });

  const token = parts[1];

  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as JwtPayload;

    req.user = {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      role: payload.role as string | undefined || "resident",
    };

    next();
  } catch (err: any) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
