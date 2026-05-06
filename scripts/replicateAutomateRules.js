import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal, REPO_ROOT } from "./loadEnvLocal.js";
import {
  axiosAutomate,
  buildPostedRuleBody,
  loadConnectorsForRule,
} from "./lib/automateRulesDestMapping.js";
import { resolveAutomateDestProjectUid } from "./lib/automateProjectUid.js";
import {
  inferAutomateAppApiBaseFromStackUrl,
  normalizeContentstackUid,
  resolveAuthtoken,
  resolveOrganizationUid,
} from "./userSession.js";

/**
 * Clone Automate **rules** from a source project/region into a destination project/region.
 * Mirrors the internal flow: GET rule → map connectors/triggers/actions on the destination
 * host → POST `/projects/{destProjectId}/rules`.
 *
 * Environment (destination — your target region / org):
 * - CONTENTSTACK_AUTOMATE_APP_API_URL — optional; inferred from USER_SESSION_BASE / stack API URL
 * - CONTENTSTACK_AUTOMATE_DEST_PROJECT_UID — or `npm run setup-automate` (automations/.automate-project-uid)
 * - CONTENTSTACK_AUTHTOKEN (or account login via userSession)
 * - CONTENTSTACK_ORGANIZATION_UID — optional; resolved if omitted
 *
 * Source (defaults suit “copy from AWS NA app” → another region):
 * - CONTENTSTACK_AUTOMATE_SOURCE_APP_API_URL — default https://app.contentstack.com/automations-api
 * - CONTENTSTACK_AUTOMATE_SOURCE_PROJECT_UID
 * - CONTENTSTACK_AUTOMATE_SOURCE_ORGANIZATION_UID — optional; defaults to destination org
 * - CONTENTSTACK_AUTOMATE_SOURCE_AUTHTOKEN — optional; defaults to same authtoken as destination
 *
 * Rules to copy:
 * - CONTENTSTACK_AUTOMATE_RULE_IDS — comma-separated rule ids
 *
 * Options:
 * - --dry-run — write `newRule-{id}.json` under automations/replicated/ only; no POST
 * - Rule ids as CLI args (hex strings) override env list when provided
 */

loadEnvLocal();

const DEFAULT_SOURCE_APP_AUTOMATE = "https://app.contentstack.com/automations-api";

function parseRuleIds(argv) {
  const fromCli = argv.filter((a) => /^[a-f0-9]{32}$/i.test(a));
  if (fromCli.length) return fromCli;
  const raw = process.env.CONTENTSTACK_AUTOMATE_RULE_IDS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");

  const destBase =
    inferAutomateAppApiBaseFromStackUrl() ||
    process.env.CONTENTSTACK_AUTOMATE_APP_API_URL?.trim()?.replace(/\/$/, "");
  if (!destBase) {
    console.error(
      "Set CONTENTSTACK_AUTOMATE_APP_API_URL or CONTENTSTACK_USER_SESSION_BASE / CONTENTSTACK_BASE_URL so the app Automate API base can be inferred."
    );
    process.exit(1);
  }

  const sourceBase =
    process.env.CONTENTSTACK_AUTOMATE_SOURCE_APP_API_URL?.trim()?.replace(/\/$/, "") ||
    DEFAULT_SOURCE_APP_AUTOMATE;

  const destProjectId = resolveAutomateDestProjectUid();
  const sourceProjectId = process.env.CONTENTSTACK_AUTOMATE_SOURCE_PROJECT_UID?.trim();
  const ruleIds = parseRuleIds(argv);

  if (!destProjectId || !sourceProjectId || !ruleIds.length) {
    console.error(
      "Required: destination project (CONTENTSTACK_AUTOMATE_DEST_PROJECT_UID or npm run setup-automate), CONTENTSTACK_AUTOMATE_SOURCE_PROJECT_UID, CONTENTSTACK_AUTOMATE_RULE_IDS (comma-separated) or pass rule ids as CLI arguments."
    );
    process.exit(1);
  }

  const destAuthtoken = await resolveAuthtoken();
  const destOrg = normalizeContentstackUid(await resolveOrganizationUid(destAuthtoken));
  if (!destOrg) {
    console.error("Could not resolve destination organization UID.");
    process.exit(1);
  }

  const sourceAuthtoken =
    process.env.CONTENTSTACK_AUTOMATE_SOURCE_AUTHTOKEN?.trim() || destAuthtoken;
  const sourceOrgRaw =
    process.env.CONTENTSTACK_AUTOMATE_SOURCE_ORGANIZATION_UID?.trim() || destOrg;
  const sourceOrg = normalizeContentstackUid(sourceOrgRaw);

  const destHeaders = { authtoken: destAuthtoken, organization_uid: destOrg };
  const sourceHeaders = { authtoken: sourceAuthtoken, organization_uid: sourceOrg };

  const destClient = axiosAutomate(destBase, destHeaders);
  const sourceClient = axiosAutomate(sourceBase, sourceHeaders);

  const outDir = path.join(REPO_ROOT, "automations", "replicated");
  fs.mkdirSync(outDir, { recursive: true });

  console.log("Source:", sourceBase, "project", sourceProjectId);
  console.log("Destination:", destBase, "project", destProjectId);
  console.log("Rules:", ruleIds.join(", "));
  console.log("");

  for (const ruleId of ruleIds) {
    console.log(`------------------- ${ruleId} -------------------`);

    const sourceRuleResp = await sourceClient.get(`/projects/${sourceProjectId}/rules/${ruleId}`);
    if (sourceRuleResp.status >= 400) {
      console.error("GET source rule failed:", sourceRuleResp.status, sourceRuleResp.data);
      continue;
    }

    const rule = { ...sourceRuleResp.data };
    delete rule._id;
    delete rule.created_by;
    delete rule.__v;
    delete rule.id;
    delete rule.updated_by;

    let connectors;
    let newRule;
    try {
      connectors = await loadConnectorsForRule(destClient, rule);
      newRule = await buildPostedRuleBody(destClient, connectors, destOrg, rule, sourceClient);
    } catch (e) {
      console.error(e?.message || e);
      continue;
    }

    const outPath = path.join(outDir, `newRule-${ruleId}.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(newRule, null, 2)}\n`, "utf8");
    console.log("Wrote", outPath);

    if (dryRun) {
      console.log("  (dry-run: skipping POST)\n");
      continue;
    }

    const res = await destClient.post(`/projects/${destProjectId}/rules`, newRule);
    console.log(
      res.status,
      typeof res.data === "object" ? JSON.stringify(res.data, null, 2).slice(0, 1200) : res.data
    );
    console.log("");
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
