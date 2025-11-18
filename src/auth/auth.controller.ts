import { Request, Response } from "express";
import { authService } from "../services/auth.service";

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
