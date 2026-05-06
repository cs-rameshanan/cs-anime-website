import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * Load `.env.local` from the app root (same folder as `package.json`).
 * @param {{ exitOnError?: boolean }} [options]
 */
export function loadEnvLocal(options = { exitOnError: true }) {
  const envLocalPath = path.join(REPO_ROOT, ".env.local");
  const envResult = dotenv.config({ path: envLocalPath, override: true });
  if (envResult.error && options.exitOnError) {
    console.error(`❌ Could not read ${envLocalPath}`);
    console.error(`   ${envResult.error.message}`);
    process.exit(1);
  }
  return envResult;
}
