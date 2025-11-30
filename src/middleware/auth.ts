import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const APP_JWT_SECRET = process.env.APP_JWT_SECRET!;
if (!APP_JWT_SECRET) {
  console.warn("⚠️ APP_JWT_SECRET is missing in .env");
}

/* ---------------------------------------------------------
 * TYPES
 * --------------------------------------------------------- */
export interface AuthUser {
  id: string;
  email?: string;
  username?: string;     // ✅ Added so TS stops complaining
  role: string;
  estate_id?: string;
  home_id?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/* ---------------------------------------------------------
 * 1. Core Token Verification
 * --------------------------------------------------------- */
function verifyToken(req: AuthRequest, res: Response): AuthUser | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Missing Authorization header" });
      return null;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Missing token" });
      return null;
    }

    const decoded = jwt.verify(token, APP_JWT_SECRET) as AuthUser;
    req.user = decoded;
    return decoded;
  } catch (err) {
    console.error("JWT Error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

/* ---------------------------------------------------------
 * 2. Default Middleware (Backward Compatible)
 * --------------------------------------------------------- */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const user = verifyToken(req, res);
  if (!user) return;
  next();
}

/* ---------------------------------------------------------
 * 3. Explicit requireAuth()
 * --------------------------------------------------------- */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = verifyToken(req, res);
  if (!user) return;
  next();
}

/* ---------------------------------------------------------
 * 4. Role Guards
 * --------------------------------------------------------- */
export function requireResident(req: AuthRequest, res: Response, next: NextFunction) {
  const user = verifyToken(req, res);
  if (!user) return;
  if (user.role !== "resident")
    return res.status(403).json({ error: "Residents only" });
  next();
}

export function requireEstateAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const user = verifyToken(req, res);
  if (!user) return;
  if (user.role !== "estate_admin" && user.role !== "manager")
    return res.status(403).json({ error: "Estate admins only" });
  next();
}

/* ---------------------------------------------------------
 * 5. Optional middleware for attaching user but not requiring auth
 * --------------------------------------------------------- */
export function attachUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, APP_JWT_SECRET) as AuthUser;
    req.user = decoded;
  } catch {
    // ignore invalid/expired tokens
  }

  next();
}
