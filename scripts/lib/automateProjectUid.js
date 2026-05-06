import fs from "fs";
import path from "path";
import { REPO_ROOT } from "../loadEnvLocal.js";

/** Written by `setupAutomate.js` (project step); read when `CONTENTSTACK_AUTOMATE_DEST_PROJECT_UID` is unset. */
export function automateProjectUidFilePath() {
  return path.join(REPO_ROOT, "automations", ".automate-project-uid");
}

/**
 * Destination Automate project id: env first, then one-line file from `npm run setup-automate`.
 */
export function resolveAutomateDestProjectUid() {
  const fromEnv = process.env.CONTENTSTACK_AUTOMATE_DEST_PROJECT_UID?.trim();
  if (fromEnv) return fromEnv;
  try {
    const line = fs.readFileSync(automateProjectUidFilePath(), "utf8").trim().split(/\r?\n/)[0]?.trim();
    if (line && /^[a-f0-9]{32}$/i.test(line)) return line;
  } catch {
    /* no file */
  }
  return "";
}

export function writeAutomateProjectUid(uid) {
  const dir = path.dirname(automateProjectUidFilePath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(automateProjectUidFilePath(), `${uid.trim()}\n`, "utf8");
}
