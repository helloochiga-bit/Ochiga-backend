// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();

// Safely read environment variables
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`⚠️ Environment variable ${name} is missing.`);
    return "";
  }
  return value;
}

// -------------------------------------------
// PORT CONFIG — safe and strict
// -------------------------------------------
export const PORT: number = process.env.PORT
  ? Number(process.env.PORT)
  : 5000;

// -------------------------------------------
// SUPABASE CONFIG
// -------------------------------------------
export const SUPABASE_URL = requireEnv("SUPABASE_URL");
export const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// -------------------------------------------
// JWT
// -------------------------------------------
export const APP_JWT_SECRET = requireEnv("APP_JWT_SECRET");

// -------------------------------------------
// UTILITY — consistent port log
// -------------------------------------------
export function logPortBinding(port: number) {
  console.log(`🚀 Ochiga backend is listening on http://0.0.0.0:${port}`);
}
