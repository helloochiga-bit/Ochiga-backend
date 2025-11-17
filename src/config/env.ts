import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 4000;
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const APP_JWT_SECRET = process.env.APP_JWT_SECRET || "replace_me";
