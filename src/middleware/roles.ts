import { Request, Response, NextFunction } from "express";
import { AuthedRequest } from "./auth";

export function requireRole(role: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (user.role !== role && user.role !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
