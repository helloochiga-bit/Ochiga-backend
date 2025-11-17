import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`⚠️ Environment variable ${name} is missing.`);
    return "";
  }
  return value;
}

export const PORT = process.env.PORT || 4000;

export const SUPABASE_URL = requireEnv("SUPABASE_URL");
export const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

/**
 * ❗ IMPORTANT:
 * No fallback secret — JWT MUST use a real secret.
 */
export const APP_JWT_SECRET = requireEnv("APP_JWT_SECRET");
