import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal, REPO_ROOT } from "./loadEnvLocal.js";
import {
  inferAutomateManagementBaseFromStackApiUrl,
  normalizeContentstackUid,
  resolveAuthtoken,
  resolveOrganizationUid,
} from "./userSession.js";

/**
 * Best-effort: create AniBot HTTP → Brand Kit Generative AI → Response automation via Automate Management API,
 * or prepare JSON for UI import (official path — see export/import guide).
 *
 * Env (same session as setup-brand-kit):
 * - CONTENTSTACK_AUTOMATE_API_URL — optional; else inferred from CONTENTSTACK_BASE_URL
 * - CONTENTSTACK_AUTOMATE_PROJECT_UID — target Automate project id (hex). If omitted, uses project_id from JSON (often wrong across orgs — set explicitly).
 * - CONTENTSTACK_BRAND_KIT_UID + CONTENTSTACK_ANIBOT_VOICE_PROFILE_UID — substitute Brand Kit step input_data
 * - CONTENTSTACK_BRAND_KIT_NAME (default AniVerse Brand Kit) + CONTENTSTACK_VOICE_PROFILE_NAME (default AniBot) — display names in {(Name||uid)} tokens
 *
 * Flags:
 * - --prepare-only  — write import-ready JSON to automations/AniBot Chat Bot.import-ready.json and exit (no API calls)
 * - path/to/file.json — override template path
 *
 * @see https://www.contentstack.com/docs/developers/automation-hub-guides/export-and-import-an-automation
 * @see https://www.contentstack.com/docs/developers/apis/automation-hub-management-api/
 */

loadEnvLocal({ exitOnError: !process.argv.includes("--prepare-only") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_TEMPLATE = path.join(REPO_ROOT, "automations", "AniBot Chat Bot.json");
const FALLBACK_TEMPLATE = path.join(REPO_ROOT, "..", "AniBot Chat Bot.json");
const PREPARED_OUT = path.join(REPO_ROOT, "automations", "AniBot Chat Bot.import-ready.json");

function resolveTemplatePath(argv) {
  const fileArg = argv.find((a) => a.endsWith(".json") && !a.startsWith("-"));
  if (fileArg) return path.resolve(process.cwd(), fileArg);
  if (fs.existsSync(DEFAULT_TEMPLATE)) return DEFAULT_TEMPLATE;
  if (fs.existsSync(FALLBACK_TEMPLATE)) return FALLBACK_TEMPLATE;
  return DEFAULT_TEMPLATE;
}

function displayToken(label, uid) {
  const safe = String(label || "Resource").replace(/[|{}]/g, "").trim() || "Resource";
  return `{(${safe}||${uid})}`;
}

function applyBrandKitSubstitutions(automation) {
  const brandUid = process.env.CONTENTSTACK_BRAND_KIT_UID?.trim();
  const voiceUid = process.env.CONTENTSTACK_ANIBOT_VOICE_PROFILE_UID?.trim();
  const brandName = (process.env.CONTENTSTACK_BRAND_KIT_NAME || "AniVerse Brand Kit").trim();
  const voiceName = (process.env.CONTENTSTACK_VOICE_PROFILE_NAME || "AniBot").trim();

  if (!brandUid && !voiceUid) return automation;

  const steps = automation.steps;
  if (!Array.isArray(steps)) return automation;

  for (const step of steps) {
    if (step?.group_name !== "brandkit" || typeof step.input_data !== "string") continue;
    try {
      const parsed = JSON.parse(step.input_data);
      if (brandUid) parsed.brandkit_id = displayToken(brandName, brandUid);
      if (voiceUid) parsed.voice_profile_uid = displayToken(voiceName, voiceUid);
      step.input_data = JSON.stringify(parsed);
    } catch {
      /* leave as-is */
    }
  }
  return automation;
}

function stripInstanceIdsForClone(automation) {
  const o = JSON.parse(JSON.stringify(automation));
  delete o.project_id;
  if (o.trigger && typeof o.trigger === "object") delete o.trigger.id;
  for (const step of o.steps || []) {
    delete step.id;
    delete step.origin_id;
  }
  return o;
}

function buildAutomateClient(baseNoV1, authtoken, orgUid) {
  return axios.create({
    baseURL: `${baseNoV1.replace(/\/$/, "")}/v1`,
    headers: {
      "Content-Type": "application/json",
      authtoken,
      organization_uid: orgUid,
    },
    validateStatus: () => true,
  });
}

function pickAutomationId(data) {
  if (!data || typeof data !== "object") return null;
  return data.id || data.automation?.id || data.rule?.id || data.uid || null;
}

function walkForHttpRunUrl(obj, depth = 0) {
  if (depth > 12 || obj == null) return null;
  if (typeof obj === "string") {
    if (obj.includes("/automations-api/run/") || obj.includes("automations-api") && obj.includes("/run/")) {
      return obj;
    }
    return null;
  }
  if (typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const u = walkForHttpRunUrl(x, depth + 1);
      if (u) return u;
    }
    return null;
  }
  for (const v of Object.values(obj)) {
    const u = walkForHttpRunUrl(v, depth + 1);
    if (u) return u;
  }
  return null;
}

function looksLikeAutomateCreateSuccess(status, data) {
  if (status < 200 || status >= 300) return false;
  if (!data || typeof data !== "object") return status === 204;
  if (data.error_message || data.errors) return false;
  if (pickAutomationId(data)) return true;
  if (typeof data.message === "string" && /created|success/i.test(data.message)) return true;
  return false;
}

async function tryCreateAutomation(client, projectUid, variants) {
  const paths = [
    (body) => ({ method: "post", url: `/projects/${projectUid}/automations`, data: body }),
    (body) => ({ method: "post", url: `/projects/${projectUid}/rules`, data: body }),
    (body) => ({ method: "post", url: `/projects/${projectUid}/automations`, data: { automation: body } }),
    (body) => ({ method: "post", url: `/projects/${projectUid}/automations`, data: { rule: body } }),
  ];

  let last = null;
  for (const body of variants) {
    for (const build of paths) {
      const req = build(body);
      const res = await client.request(req);
      last = res;
      if (looksLikeAutomateCreateSuccess(res.status, res.data)) {
        return { res, id: pickAutomationId(res.data), req };
      }
    }
  }
  return { last };
}

async function main() {
  const argv = process.argv.slice(2);
  const prepareOnly = argv.includes("--prepare-only");

  const templatePath = resolveTemplatePath(argv);
  if (!fs.existsSync(templatePath)) {
    console.error("Template JSON not found:", templatePath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  const withSubs = applyBrandKitSubstitutions(JSON.parse(JSON.stringify(raw)));

  const projectUidFromEnv = process.env.CONTENTSTACK_AUTOMATE_PROJECT_UID?.trim();
  const projectUidFromFile = typeof raw.project_id === "string" ? raw.project_id.trim() : "";
  const projectUid = projectUidFromEnv || projectUidFromFile;

  fs.mkdirSync(path.dirname(PREPARED_OUT), { recursive: true });
  const importReady = { ...withSubs, ...(projectUid ? { project_id: projectUid } : {}) };
  fs.writeFileSync(PREPARED_OUT, `${JSON.stringify(importReady, null, 2)}\n`, "utf8");
  console.log("Wrote import-ready JSON:", PREPARED_OUT);

  if (prepareOnly) {
    console.log(
      "\nImport in Contentstack: Automate → your project → + New Automation → Import → choose the file above."
    );
    console.log(
      "Guide: https://www.contentstack.com/docs/developers/automation-hub-guides/export-and-import-an-automation"
    );
    return;
  }

  if (!projectUid) {
    console.error(
      "Set CONTENTSTACK_AUTOMATE_PROJECT_UID (Automate project id from the UI URL or GET /v1/projects)."
    );
    process.exit(1);
  }

  const base =
    inferAutomateManagementBaseFromStackApiUrl() || "https://automations-api.contentstack.com";
  console.log("Automate API base:", base);

  const authtoken = await resolveAuthtoken();
  const orgUid = normalizeContentstackUid(await resolveOrganizationUid(authtoken));
  if (!orgUid) {
    console.error("Could not resolve organization UID.");
    process.exit(1);
  }

  const client = buildAutomateClient(base, authtoken, orgUid);

  const fullBody = { ...withSubs };
  delete fullBody.project_id;

  const strippedBody = stripInstanceIdsForClone(withSubs);

  const created = await tryCreateAutomation(client, projectUid, [fullBody, strippedBody]);

  if (!created?.res) {
    const probe = created?.last;
    console.error(
      "Automate API did not accept programmatic create (last HTTP",
      probe?.status ?? "?",
      "). Official workflow is UI Import using:",
      PREPARED_OUT
    );
    if (probe?.data) console.error(JSON.stringify(probe.data, null, 2).slice(0, 1500));
    console.error(
      "\nDocs: https://www.contentstack.com/docs/developers/automation-hub-guides/export-and-import-an-automation"
    );
    process.exit(1);
  }

  const { res, id } = created;
  console.log("API response HTTP", res.status, pickAutomationId(res.data) ? `(automation id: ${pickAutomationId(res.data)})` : "");

  const automationUid = id || pickAutomationId(res.data);
  if (automationUid && process.env.CONTENTSTACK_AUTOMATION_ACTIVATE === "true") {
    const patch = await client.patch(`/projects/${projectUid}/automations/${automationUid}`, {
      active: true,
    });
    if (patch.status < 400) console.log("✓ Activated automation", automationUid);
    else console.warn("Activate PATCH failed:", patch.status, patch.data);
  }

  if (automationUid) {
    const detail = await client.get(`/projects/${projectUid}/automations/${automationUid}`, {
      params: { show_steps: "true" },
    });
    const runUrl = walkForHttpRunUrl(detail.data);
    if (runUrl) {
      console.log("\nAdd to .env.local:");
      console.log(`  CONTENTSTACK_AUTOMATION_URL=${runUrl}`);
    } else {
      console.log(
        "\nCopy the HTTP trigger webhook URL from the automation in the UI, then set CONTENTSTACK_AUTOMATION_URL."
      );
    }
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
