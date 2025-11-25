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

// Use PORT from environment, fallback to 5000
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Supabase
export const SUPABASE_URL = requireEnv("SUPABASE_URL");
export const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// JWT secret
export const APP_JWT_SECRET = requireEnv("APP_JWT_SECRET");

/**
 * Utility to log which port the app actually binds to
 */
export function logPortBinding(actualPort: number) {
  console.log(`✅ Ochiga backend is listening on 0.0.0.0:${actualPort}`);
}
