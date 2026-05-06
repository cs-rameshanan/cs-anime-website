import fs from "fs";
import path from "path";
import { loadEnvLocal, REPO_ROOT } from "./loadEnvLocal.js";
import {
  axiosAutomate,
  buildPostedRuleBody,
  loadConnectorsForRule,
} from "./lib/automateRulesDestMapping.js";
import { automateProjectUidFilePath, resolveAutomateDestProjectUid, writeAutomateProjectUid } from "./lib/automateProjectUid.js";
import {
  inferAutomateAppApiBaseFromStackUrl,
  normalizeContentstackUid,
  resolveAuthtoken,
  resolveOrganizationUid,
} from "./userSession.js";

/**
 * Contentstack Automate — **one script** for project + rule import:
 *
 * 1. **Project (default)** — create or reuse an Automate project, write `automations/.automate-project-uid`
 *    `npm run setup-automate`
 *    Flags: `--reuse` — only link existing project by title (no POST create)
 *
 * 2. **Import** — map exported automation JSON to your region and POST `/projects/{id}/rules`
 *    `npm run setup-automate -- import --dry-run`
 *    `npm run setup-automate -- import`
 *    Optional JSON paths after `import`; default: AniBot + rameshanan exports next to app or under `automations/`.
 *
 * Env: see replicateAutomateRules / previous split scripts; `CONTENTSTACK_AUTOMATE_DEST_PROJECT_UID` optional for `import --dry-run`.
 */

loadEnvLocal();

const DEFAULT_PROJECT_NAME = "AniVerse Automate";
const DEFAULT_SOURCE_APP_AUTOMATE = "https://app.contentstack.com/automations-api";

// ─── project (create / reuse) ─────────────────────────────────────────────

function unwrapProjectsPayload(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.projects)) return data.projects;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data?.projects)) return data.data.projects;
  if (Array.isArray(data)) return data;
  return [];
}

function pickProjectId(data) {
  if (!data || typeof data !== "object") return null;
  return data.id || data.project?.id || data.project_id || null;
}

async function listProjects(client) {
  const paths = ["/v1/projects?limit=100&skip=0", "/projects?limit=100&skip=0"];
  for (const p of paths) {
    const { data, status } = await client.get(p);
    if (status < 400) {
      const projects = unwrapProjectsPayload(data);
      return { projects, pathUsed: p };
    }
  }
  return { projects: [], pathUsed: null };
}

async function findProjectByTitle(client, title) {
  const { projects } = await listProjects(client);
  const t = title.trim().toLowerCase();
  const hit = projects.find((p) => String(p.title || p.name || "").trim().toLowerCase() === t);
  return hit?.id || null;
}

async function createProject(client, body) {
  const paths = ["/v1/projects", "/projects"];
  let last = null;
  for (const p of paths) {
    const res = await client.post(p, body);
    last = res;
    if (res.status >= 200 && res.status < 300) {
      const id = pickProjectId(res.data);
      if (id) return { id, httpPath: p, res };
    }
  }
  return { id: null, last };
}

async function runProject(argv) {
  const reuseOnly = argv.includes("--reuse");

  const base =
    inferAutomateAppApiBaseFromStackUrl() ||
    process.env.CONTENTSTACK_AUTOMATE_APP_API_URL?.trim()?.replace(/\/$/, "");
  if (!base) {
    console.error(
      "Set CONTENTSTACK_AUTOMATE_APP_API_URL or CONTENTSTACK_USER_SESSION_BASE / CONTENTSTACK_BASE_URL so the app Automate API base can be inferred."
    );
    process.exit(1);
  }

  const title = process.env.CONTENTSTACK_AUTOMATE_PROJECT_NAME?.trim() || DEFAULT_PROJECT_NAME;
  const description =
    process.env.CONTENTSTACK_AUTOMATE_PROJECT_DESCRIPTION?.trim() ||
    "Automate project for AniVerse — created by scripts/setupAutomate.js";

  const authtoken = await resolveAuthtoken();
  const orgUid = normalizeContentstackUid(await resolveOrganizationUid(authtoken));
  if (!orgUid) {
    console.error("Could not resolve organization UID.");
    process.exit(1);
  }

  const client = axiosAutomate(base, { authtoken, organization_uid: orgUid });

  console.log("Automate API base:", base);
  console.log("Organization UID:", orgUid);
  console.log("Project title:", title);
  console.log("");

  let projectId = null;

  if (reuseOnly) {
    projectId = await findProjectByTitle(client, title);
    if (!projectId) {
      console.error(`No existing project titled "${title}". Remove --reuse to create one.`);
      process.exit(1);
    }
    console.log("Reusing existing project id:", projectId);
  } else {
    const existing = await findProjectByTitle(client, title);
    if (existing) {
      console.log(`Project "${title}" already exists; using id: ${existing}`);
      projectId = existing;
    } else {
      const body = { title, description, tags: ["anime-website"] };
      const { id, last } = await createProject(client, body);
      if (!id) {
        console.error("Create project failed. Last response:", last?.status, last?.data);
        process.exit(1);
      }
      projectId = id;
      console.log("Created Automate project id:", projectId);
    }
  }

  writeAutomateProjectUid(projectId);

  console.log("");
  console.log("Saved:", automateProjectUidFilePath());
  console.log("");
  console.log("Optional — add to .env.local:");
  console.log(`  CONTENTSTACK_AUTOMATE_DEST_PROJECT_UID=${projectId}`);
  console.log("");
  console.log("Next — import exported automations:");
  console.log("  npm run setup-automate -- import --dry-run");
  console.log("  npm run setup-automate -- import");
}

// ─── import from JSON exports ───────────────────────────────────────────────

function defaultExportJsonPaths() {
  const parent = path.join(REPO_ROOT, "..");
  const names = ["AniBot Chat Bot.json", "rameshanan-app-automation.json"];
  const out = [];
  for (const n of names) {
    const a = path.join(parent, n);
    if (fs.existsSync(a)) out.push(a);
  }
  const inRepo = path.join(REPO_ROOT, "automations", "AniBot Chat Bot.json");
  if (fs.existsSync(inRepo) && !out.includes(inRepo)) out.push(inRepo);
  return out;
}

function parseJsonPaths(importArgv) {
  const fromCli = importArgv
    .filter((a) => a.endsWith(".json") && !a.startsWith("-"))
    .map((p) => path.resolve(p));
  if (fromCli.length) return fromCli;
  return defaultExportJsonPaths();
}

function slugFromPath(filePath) {
  return path.basename(filePath, ".json").replace(/[^a-z0-9_-]+/gi, "-");
}

async function runImportExports(importArgv) {
  const dryRun = importArgv.includes("--dry-run");
  const jsonPaths = parseJsonPaths(importArgv);

  if (!jsonPaths.length) {
    console.error(
      "No export JSON files found. Place AniBot Chat Bot.json and rameshanan-app-automation.json next to the anime-website folder, or pass paths after `import`."
    );
    process.exit(1);
  }

  const destBase =
    inferAutomateAppApiBaseFromStackUrl() ||
    process.env.CONTENTSTACK_AUTOMATE_APP_API_URL?.trim()?.replace(/\/$/, "");
  if (!destBase) {
    console.error(
      "Set CONTENTSTACK_AUTOMATE_APP_API_URL or CONTENTSTACK_USER_SESSION_BASE / CONTENTSTACK_BASE_URL so the app Automate API base can be inferred."
    );
    process.exit(1);
  }

  const destProjectId = resolveAutomateDestProjectUid();
  if (!destProjectId && !dryRun) {
    console.error(
      "Set CONTENTSTACK_AUTOMATE_DEST_PROJECT_UID in .env.local, or run: npm run setup-automate (creates project and saves automations/.automate-project-uid)"
    );
    console.error("(writes)", automateProjectUidFilePath());
    process.exit(1);
  }

  const sourceBase =
    process.env.CONTENTSTACK_AUTOMATE_SOURCE_APP_API_URL?.trim()?.replace(/\/$/, "") ||
    DEFAULT_SOURCE_APP_AUTOMATE;

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

  const destClient = axiosAutomate(destBase, {
    authtoken: destAuthtoken,
    organization_uid: destOrg,
  });
  const sourceClient = axiosAutomate(sourceBase, {
    authtoken: sourceAuthtoken,
    organization_uid: sourceOrg,
  });

  const outDir = path.join(REPO_ROOT, "automations", "replicated");
  fs.mkdirSync(outDir, { recursive: true });

  console.log("Destination:", destBase, "project", destProjectId || "(not set — OK for --dry-run only)");
  console.log("Optional source (trigger title lookup):", sourceBase);
  console.log("Files:", jsonPaths.join(", "));
  console.log("");

  for (const filePath of jsonPaths) {
    const label = path.basename(filePath);
    console.log(`------------------- ${label} -------------------`);

    let rule;
    try {
      rule = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (e) {
      console.error("Invalid JSON:", filePath, e?.message || e);
      continue;
    }

    if (!Array.isArray(rule.steps) || !Array.isArray(rule.step_groups)) {
      console.error("File must look like an exported automation (steps[], step_groups[]).");
      continue;
    }

    delete rule._id;
    delete rule.created_by;
    delete rule.__v;
    delete rule.id;
    delete rule.updated_by;

    let newRule;
    try {
      const connectors = await loadConnectorsForRule(destClient, rule);
      newRule = await buildPostedRuleBody(destClient, connectors, destOrg, rule, sourceClient);
    } catch (e) {
      console.error(e?.message || e);
      continue;
    }

    const outPath = path.join(outDir, `import-${slugFromPath(filePath)}.json`);
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

// ─── router ─────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const first = argv[0]?.toLowerCase();

  if (first === "import") {
    await runImportExports(argv.slice(1));
    return;
  }

  if (first === "help" || first === "-h" || first === "--help") {
    console.log(`Contentstack Automate (single script)

  npm run setup-automate              Create/reuse project → automations/.automate-project-uid
  npm run setup-automate -- --reuse   Reuse existing project by title only

  npm run setup-automate -- import [--dry-run] [path/to/export.json ...]
                                      Map exports and POST rules (dry-run writes JSON only)
`);
    return;
  }

  await runProject(argv);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
