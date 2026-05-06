import axios from "axios";

/**
 * Contentstack user session (authtoken) + org resolution for APIs that
 * cannot use stack Management tokens (Brand Kit, Personalize Management).
 * @see https://www.contentstack.com/docs/developers/apis/content-management-api#user-session
 */

/** CMA root for login / user / organizations (often `…-app…/api/v3` on non-prod). */
export function getUserSessionApiRoot() {
  const explicit = process.env.CONTENTSTACK_USER_SESSION_BASE;
  if (explicit) return explicit.replace(/\/$/, "");

  const mg = (process.env.CONTENTSTACK_BASE_URL || "https://api.contentstack.io/v3").replace(/\/$/, "");
  if (/api\.contentstack\.io\/v3$/i.test(mg)) return mg;
  if (/\/api\/v3$/i.test(mg)) return mg;

  const m = mg.match(/^https?:\/\/([\w-]+)-api(\.[\w.-]+)\/v3$/i);
  if (m) return `https://${m[1]}-app${m[2]}/api/v3`;

  return mg;
}

/** e.g. https://stag-azure-na-api….csnonprod.com/v3 → https://stag-azure-na-personalize-api….csnonprod.com */
export function inferPersonalizeManagementBaseFromStackApiUrl() {
  const u = (process.env.CONTENTSTACK_BASE_URL || "").replace(/\/$/, "");
  const m = u.match(/^https?:\/\/([\w.-]+?)-api(\.[\w.-]+)\/v3$/i);
  if (!m) return null;
  return `https://${m[1]}-personalize-api${m[2]}`;
}

/**
 * Automate Management API base (no `/v1` suffix).
 * e.g. `…-api…/v3` → `https://{stack}-automations-api{suffix}`.
 * Override: CONTENTSTACK_AUTOMATE_API_URL
 * @see https://www.contentstack.com/docs/developers/apis/automation-hub-management-api/
 */
export function inferAutomateManagementBaseFromStackApiUrl() {
  const explicit = process.env.CONTENTSTACK_AUTOMATE_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const u = (process.env.CONTENTSTACK_BASE_URL || "").replace(/\/$/, "");
  const m = u.match(/^https?:\/\/([\w.-]+?)-api(\.[\w.-]+)\/v3$/i);
  if (m) return `https://${m[1]}-automations-api${m[2]}`;

  if (/^https:\/\/api\.contentstack\.io\/v3$/i.test(u)) {
    return "https://automations-api.contentstack.com";
  }
  return null;
}

/**
 * `https://stag-azure-na-api….com/v3` → `https://stag-azure-na-app….com/automations-api`
 * (replaces the stack `-api` host segment with `-app`; avoids brittle single-group regexes on hyphenated names).
 */
function managementV3UrlToAppAutomateApiBase(managementV3Url) {
  const raw = (managementV3Url || "").trim().replace(/\/$/, "");
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  const { protocol, hostname } = parsed;
  if (/^api\.contentstack\.io$/i.test(hostname)) {
    return "https://app.contentstack.com/automations-api";
  }
  const appHost = hostname.replace(/-api(\.|$)/i, "-app$1");
  if (appHost === hostname) return null;
  return `${protocol}//${appHost}/automations-api`.replace(/\/$/, "");
}

/**
 * Automate API on the **app** host (`…/automations-api`), used for connectors/triggers/rules
 * in the same way as the Contentstack web app (often without a `/v1` prefix).
 * Override: CONTENTSTACK_AUTOMATE_APP_API_URL
 */
export function inferAutomateAppApiBaseFromStackUrl() {
  const explicit = process.env.CONTENTSTACK_AUTOMATE_APP_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const sessionBase = process.env.CONTENTSTACK_USER_SESSION_BASE?.trim()?.replace(/\/$/, "");
  if (sessionBase) {
    const m0 = sessionBase.match(/^(https?:\/\/[^/]+)\/api\/v3$/i);
    if (m0) return `${m0[1]}/automations-api`;
  }

  const fromBase = managementV3UrlToAppAutomateApiBase(process.env.CONTENTSTACK_BASE_URL);
  if (fromBase) return fromBase;

  const fromApiUrl = managementV3UrlToAppAutomateApiBase(process.env.CONTENTSTACK_API_URL);
  if (fromApiUrl) return fromApiUrl;

  const hostOnly = process.env.CONTENTSTACK_API_HOST?.trim();
  if (hostOnly && !/:\/\//.test(hostOnly)) {
    const synthetic = `https://${hostOnly}/v3`;
    const fromHost = managementV3UrlToAppAutomateApiBase(synthetic);
    if (fromHost) return fromHost;
  }

  return null;
}

/**
 * Browser / app UI uses this host to update Personalize projects (stack link), not the standalone personalize-api host.
 * e.g. `https://stag-azure-na-app.csnonprod.com/personalize-api` from `…-api…/v3` + `CONTENTSTACK_USER_SESSION_BASE` `…-app…/api/v3`.
 * Override: CONTENTSTACK_PERSONALIZE_PROJECTS_API_URL
 */
export function inferPersonalizeProjectsApiBaseFromStackUrl() {
  const explicit = process.env.CONTENTSTACK_PERSONALIZE_PROJECTS_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const sessionBase = process.env.CONTENTSTACK_USER_SESSION_BASE?.trim()?.replace(/\/$/, "");
  if (sessionBase) {
    const m0 = sessionBase.match(/^(https?:\/\/[^/]+)\/api\/v3$/i);
    if (m0) return `${m0[1]}/personalize-api`;
  }

  const mg = (process.env.CONTENTSTACK_BASE_URL || "").replace(/\/$/, "");
  const m = mg.match(/^https?:\/\/([\w-]+)-api(\.[\w.-]+)\/v3$/i);
  if (m) return `https://${m[1]}-app${m[2]}/personalize-api`;
  if (/^https:\/\/api\.contentstack\.io\/v3$/i.test(mg)) {
    return "https://app.contentstack.com/personalize-api";
  }
  return null;
}

/**
 * Contentstack UIDs are strings; APIs occasionally nest or wrap them in arrays.
 */
export function normalizeContentstackUid(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return normalizeContentstackUid(value[0]);
  if (typeof value === "object" && value !== null && "uid" in value) {
    return normalizeContentstackUid(value.uid);
  }
  if (typeof value !== "string") return null;
  let t = value.trim();
  if (!t) return null;
  if (t.startsWith("[") && t.endsWith("]")) {
    t = t
      .slice(1, -1)
      .trim()
      .replace(/^['"]+|['"]+$/g, "")
      .trim();
  }
  // Stack / org / content UIDs use prefixes like blt…, cs… (not hex-only).
  if (/^[a-z0-9]{8,40}$/i.test(t)) return t;
  return null;
}

export function walkForUid(obj, keyRegex) {
  if (!obj || typeof obj !== "object") return null;
  for (const [k, v] of Object.entries(obj)) {
    if (keyRegex.test(k) && typeof v === "string") {
      const n = normalizeContentstackUid(v);
      if (n) return n;
    }
    const nested = walkForUid(v, keyRegex);
    if (nested) return nested;
  }
  return null;
}

export async function fetchUserDocument(authtoken) {
  const root = getUserSessionApiRoot();
  const headers = {
    authtoken,
    "Content-Type": "application/json",
    ...(process.env.CONTENTSTACK_API_KEY?.trim()
      ? { api_key: process.env.CONTENTSTACK_API_KEY.trim() }
      : {}),
  };
  for (const path of ["/user/current", "/user", "/users/me"]) {
    const { data, status } = await axios.get(`${root}${path}`, {
      headers,
      validateStatus: () => true,
    });
    if (status < 400 && data) return data.user || data.data?.user || data;
  }
  return null;
}

async function loginWithCredentials(email, password, tfa) {
  const root = getUserSessionApiRoot();
  const bodies = [
    { user: { email, password, ...(tfa ? { tfa_token: tfa } : {}) } },
    { email, password, ...(tfa ? { tfa_token: tfa } : {}) },
  ];
  const paths = ["/user-session/login", "/login"];

  for (const path of paths) {
    for (const body of bodies) {
      const url = `${root}${path}`;
      const { data, status } = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      });
      if (status >= 400) continue;

      const token =
        data?.user?.authtoken ||
        data?.authtoken ||
        data?.data?.user?.authtoken ||
        data?.data?.authtoken;
      if (token) {
        const trimmed = String(token).trim();
        process.env.CONTENTSTACK_AUTHTOKEN = trimmed;
        return trimmed;
      }
    }
  }

  throw new Error(
    `Could not log in to Contentstack user session at ${root}. Check CONTENTSTACK_USER_SESSION_BASE, credentials, MFA (CONTENTSTACK_ACCOUNT_TFA_TOKEN), and SSO (IdP users cannot obtain an authtoken via this API).`
  );
}

/**
 * Returns a user authtoken. If CONTENTSTACK_ACCOUNT_EMAIL + password are set,
 * always logs in (fresh token) so Brand Kit / Personalize are not stuck with an
 * expired authtoken from .env.local. Otherwise uses CONTENTSTACK_AUTHTOKEN.
 */
export async function resolveAuthtoken() {
  const email =
    process.env.CONTENTSTACK_ACCOUNT_EMAIL?.trim() ||
    process.env.CONTENTSTACK_LOGIN_EMAIL?.trim() ||
    process.env.CONTENTSTACK_USER_EMAIL?.trim();
  const password =
    process.env.CONTENTSTACK_ACCOUNT_PASSWORD ||
    process.env.CONTENTSTACK_LOGIN_PASSWORD ||
    process.env.CONTENTSTACK_USER_PASSWORD;
  const tfa =
    process.env.CONTENTSTACK_ACCOUNT_TFA_TOKEN?.trim() ||
    process.env.CONTENTSTACK_TFA_TOKEN?.trim();

  if (email && password) {
    return loginWithCredentials(email, password, tfa);
  }

  if (process.env.CONTENTSTACK_AUTHTOKEN?.trim()) {
    return process.env.CONTENTSTACK_AUTHTOKEN.trim();
  }

  throw new Error(
    "Set CONTENTSTACK_ACCOUNT_EMAIL + CONTENTSTACK_ACCOUNT_PASSWORD for automatic login, or set CONTENTSTACK_AUTHTOKEN."
  );
}

/**
 * Resolves organization UID for Brand Kit API.
 */
export async function resolveOrganizationUid(authtoken) {
  const fromEnv = normalizeContentstackUid(process.env.CONTENTSTACK_ORGANIZATION_UID);
  if (fromEnv) {
    process.env.CONTENTSTACK_ORGANIZATION_UID = fromEnv;
    return fromEnv;
  }

  const root = getUserSessionApiRoot();
  const stackApiKey = process.env.CONTENTSTACK_API_KEY?.trim();
  const headers = {
    authtoken,
    "Content-Type": "application/json",
    ...(stackApiKey ? { api_key: stackApiKey } : {}),
  };

  let userPayload = await fetchUserDocument(authtoken);

  if (!userPayload) {
    const { data, status } = await axios.get(`${root}/organizations`, {
      headers: { authtoken, "Content-Type": "application/json" },
      validateStatus: () => true,
    });
    if (status < 400 && data) {
      const orgs = data.organizations || data.items || (Array.isArray(data) ? data : []);
      if (stackApiKey) {
        for (const org of orgs) {
          if (typeof org === "string") continue;
          const uid = normalizeContentstackUid(org.uid || org.org_uid);
          const stacks = org.stacks || org.stack || [];
          const list = Array.isArray(stacks) ? stacks : [stacks];
          if (list.some((s) => (s.api_key || s.uid) === stackApiKey)) {
            if (uid) {
              process.env.CONTENTSTACK_ORGANIZATION_UID = uid;
              return uid;
            }
          }
        }
      }
      const firstOrg = orgs[0];
      const first = normalizeContentstackUid(
        typeof firstOrg === "string" ? firstOrg : firstOrg?.uid || firstOrg?.org_uid
      );
      if (first) {
        process.env.CONTENTSTACK_ORGANIZATION_UID = first;
        return first;
      }
    }
    throw new Error(
      "Could not resolve CONTENTSTACK_ORGANIZATION_UID. Set it explicitly, or ensure user-session login works and the user belongs to an organization."
    );
  }

  const fromStacks = normalizeContentstackUid(walkStacksForOrgUid(userPayload, stackApiKey));
  if (fromStacks) {
    process.env.CONTENTSTACK_ORGANIZATION_UID = fromStacks;
    return fromStacks;
  }

  const uid = normalizeContentstackUid(
    userPayload.org_uid ||
      userPayload.organization_uid ||
      userPayload.organization?.uid ||
      walkForUid(userPayload, /organization.*uid|^orgUid$/i)
  );
  if (uid) {
    process.env.CONTENTSTACK_ORGANIZATION_UID = uid;
    return uid;
  }

  throw new Error(
    "Could not derive organization UID from the user profile. Set CONTENTSTACK_ORGANIZATION_UID in .env.local."
  );
}

function walkStacksForOrgUid(node, stackApiKey, parentOrgUid = null) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = walkStacksForOrgUid(item, stackApiKey, parentOrgUid);
      if (r) return r;
    }
    return null;
  }
  const orgUid = node.org_uid || node.organization_uid || node.uid || parentOrgUid;
  const stacks = node.stacks || node.stack;
  if (stacks && stackApiKey) {
    const list = Array.isArray(stacks) ? stacks : [stacks];
    for (const s of list) {
      if (s && (s.api_key === stackApiKey || s.stack_api_key === stackApiKey)) {
        return normalizeContentstackUid(
          node.organization?.uid || node.organization_uid || orgUid || null
        );
      }
    }
  }
  for (const v of Object.values(node)) {
    const r = walkStacksForOrgUid(v, stackApiKey, orgUid);
    if (r) return r;
  }
  return null;
}

/**
 * Best-effort Personalize project UID from user/session payload or env.
 */
export function resolvePersonalizeProjectUidFromUser(userLike) {
  if (!userLike || typeof userLike !== "object") return null;
  const blob = JSON.stringify(userLike);
  const m = blob.match(
    /"(?:personalize[^"]*project[^"]*uid|project_uid|personalizeProjectUid)"\s*:\s*"([a-z0-9]{8,40})"/i
  );
  if (m) return normalizeContentstackUid(m[1]);
  return (
    walkForUid(userLike, /personalize.*project|project.*personalize|personalize_project|personalizeProject/i) ||
    null
  );
}

function getUniqPersonalizeManagementBases() {
  const bases = [
    process.env.CONTENTSTACK_PERSONALIZE_MANAGEMENT_URL?.replace(/\/$/, ""),
    inferPersonalizeManagementBaseFromStackApiUrl(),
    "https://personalize-api.contentstack.com",
  ].filter(Boolean);
  const seen = new Set();
  return bases.filter((b) => {
    if (seen.has(b)) return false;
    seen.add(b);
    return true;
  });
}

const PERSONALIZE_PROJECT_LIST_PATHS = ["/projects", "/v1/projects", "/personalize/projects"];

function extractPersonalizeProjectArray(data) {
  if (Array.isArray(data)) return data;
  const list = data?.projects || data?.items || data?.data;
  return Array.isArray(list) ? list : [];
}

function normalizePersonalizeProjectRow(p) {
  const uid = normalizeContentstackUid(p?.uid || p?.project_uid || p?.project?.uid);
  if (!uid) return null;
  const name = String(p?.name ?? p?.title ?? "").trim();
  return {
    uid,
    name,
    stackLinked:
      p?.stack_api_key ||
      p?.stack?.api_key ||
      p?.api_key ||
      p?.stack_uid ||
      p?.stack?.uid ||
      null,
    raw: p,
  };
}

/**
 * Best-effort: list Personalize projects (undocumented list endpoints; not in public OpenAPI).
 * @returns {Promise<Array<{ uid: string, name: string, stackLinked: string|null, raw: unknown }>>}
 */
export async function listPersonalizeProjects(authtoken) {
  const uniqBases = getUniqPersonalizeManagementBases();
  let headers = {
    authtoken,
    "Content-Type": "application/json",
    ...(process.env.CONTENTSTACK_API_KEY?.trim()
      ? { api_key: process.env.CONTENTSTACK_API_KEY.trim() }
      : {}),
    ...(process.env.CONTENTSTACK_ORGANIZATION_UID?.trim()
      ? { organization_uid: process.env.CONTENTSTACK_ORGANIZATION_UID.trim() }
      : {}),
  };

  const tryList = async (h) => {
    const byUid = new Map();
    for (const base of uniqBases) {
      for (const path of PERSONALIZE_PROJECT_LIST_PATHS) {
        try {
          const { data, status } = await axios.get(`${base}${path}`, {
            headers: h,
            validateStatus: () => true,
          });
          if (status >= 400) continue;
          for (const p of extractPersonalizeProjectArray(data)) {
            const row = normalizePersonalizeProjectRow(p);
            if (row && !byUid.has(row.uid)) byUid.set(row.uid, row);
          }
        } catch {
          /* try next */
        }
      }
    }
    return [...byUid.values()];
  };

  let rows = await tryList(headers);
  if (
    rows.length === 0 &&
    !process.env.CONTENTSTACK_ORGANIZATION_UID?.trim() &&
    process.env.CONTENTSTACK_API_KEY?.trim()
  ) {
    try {
      const orgUid = await resolveOrganizationUid(authtoken);
      headers = {
        ...headers,
        organization_uid: orgUid,
      };
      rows = await tryList(headers);
    } catch {
      /* org optional for list */
    }
  }
  return rows;
}

function pickPersonalizeProjectUidFromRows(rows, stackKey) {
  if (!rows?.length) return null;
  for (const row of rows) {
    if (stackKey && row.stackLinked && row.stackLinked === stackKey) return row.uid;
  }
  if (rows.length === 1) return rows[0].uid;
  return null;
}

/**
 * Parse project UID from a create-project style JSON response.
 */
function parsePersonalizeProjectUidFromResponse(data) {
  if (!data || typeof data !== "object") return null;
  return normalizeContentstackUid(
    data.uid ||
      data.project_uid ||
      data.project?.uid ||
      data.data?.uid ||
      data.data?.project?.uid ||
      data.personalize_project?.uid
  );
}

/**
 * Undocumented best-effort create. Official Personalize Management OpenAPI has no /projects;
 * some stacks expose list/create under alternate paths — try several shapes then give up.
 */
async function tryCreatePersonalizeProject(authtoken, projectName) {
  const uniqBases = getUniqPersonalizeManagementBases();
  const apiKey = process.env.CONTENTSTACK_API_KEY?.trim();
  let headers = {
    authtoken,
    "Content-Type": "application/json",
    ...(apiKey ? { api_key: apiKey } : {}),
    ...(process.env.CONTENTSTACK_ORGANIZATION_UID?.trim()
      ? { organization_uid: process.env.CONTENTSTACK_ORGANIZATION_UID.trim() }
      : {}),
  };

  const description = "AniVerse — created by scripts/setupPersonalize.js";
  const bodyVariants = [
    { name: projectName, description },
    { name: projectName },
    ...(apiKey
      ? [
          { name: projectName, description, stack_api_key: apiKey },
          { name: projectName, stack_api_key: apiKey },
          { name: projectName, api_key: apiKey },
          { name: projectName, stack: { api_key: apiKey } },
          { project: { name: projectName, description } },
        ]
      : []),
  ];

  const postOnce = async (h) => {
    for (const base of uniqBases) {
      for (const path of PERSONALIZE_PROJECT_LIST_PATHS) {
        for (const body of bodyVariants) {
          try {
            const { data, status } = await axios.post(`${base}${path}`, body, {
              headers: h,
              validateStatus: () => true,
            });
            if (status >= 400) continue;
            const uid = parsePersonalizeProjectUidFromResponse(data);
            if (uid) return uid;
          } catch {
            /* try next */
          }
        }
      }
    }
    return null;
  };

  let uid = await postOnce(headers);
  if (uid) return uid;
  if (!process.env.CONTENTSTACK_ORGANIZATION_UID?.trim() && apiKey) {
    try {
      const orgUid = await resolveOrganizationUid(authtoken);
      uid = await postOnce({
        ...headers,
        organization_uid: orgUid,
      });
      if (uid) return uid;
    } catch {
      /* optional */
    }
  }
  return null;
}

/**
 * Resolve default Personalize project name (match by name before create).
 * @see CONTENTSTACK_PERSONALIZE_PROJECT_NAME
 */
export function getPersonalizeProjectName() {
  return (
    process.env.CONTENTSTACK_PERSONALIZE_PROJECT_NAME?.trim() ||
    process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_NAME?.trim() ||
    "AniVerse"
  );
}

function findPersonalizeProjectRowByName(rows, projectName) {
  if (!projectName || !rows?.length) return null;
  const exact = rows.find((r) => r.name === projectName);
  if (exact) return exact;
  const lower = projectName.toLowerCase();
  return rows.find((r) => r.name && r.name.toLowerCase() === lower) || null;
}

/**
 * List projects, return UID of one named `projectName`, or best-effort POST to create it.
 * @returns {Promise<string|null>} project UID or null if list/create did not apply
 */
export async function ensurePersonalizeProjectByName(authtoken, projectName = getPersonalizeProjectName()) {
  const name = projectName?.trim();
  if (!name) return null;

  const rows = await listPersonalizeProjects(authtoken);
  const existing = findPersonalizeProjectRowByName(rows, name);
  if (existing) return existing.uid;

  return tryCreatePersonalizeProject(authtoken, name);
}

async function tryDiscoverPersonalizeProjectUid(authtoken) {
  const stackKey = process.env.CONTENTSTACK_API_KEY?.trim();
  const rows = await listPersonalizeProjects(authtoken);
  return pickPersonalizeProjectUidFromRows(rows, stackKey);
}

/**
 * Env, user profile, stack settings (CMA), optional project-list GET — in that order.
 */
export async function resolvePersonalizeProjectUid(authtoken) {
  const hints = [];

  const envUid =
    process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID?.trim() ||
    process.env.CONTENTSTACK_PERSONALIZE_PROJECT_UID?.trim();
  if (envUid) return envUid;
  hints.push(
    "No NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID (or CONTENTSTACK_PERSONALIZE_PROJECT_UID) in .env.local — if it is commented out, uncomment it."
  );

  let uid = await ensurePersonalizeProjectByName(authtoken);
  if (uid) {
    process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID = uid;
    process.env.CONTENTSTACK_PERSONALIZE_PROJECT_UID = uid;
    return uid;
  }
  hints.push(
    `Tried list/create Personalize project named "${getPersonalizeProjectName()}" (CONTENTSTACK_PERSONALIZE_PROJECT_NAME); no match or create response (undocumented endpoints).`
  );

  const user = await fetchUserDocument(authtoken);
  if (!user) {
    hints.push(
      "User session GET (/user, /user/current, …) did not return a profile — check CONTENTSTACK_USER_SESSION_BASE and CONTENTSTACK_AUTHTOKEN."
    );
  }
  uid = user ? resolvePersonalizeProjectUidFromUser(user) : null;
  if (uid) {
    process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID = uid;
    process.env.CONTENTSTACK_PERSONALIZE_PROJECT_UID = uid;
    return uid;
  }
  if (user) {
    hints.push("User JSON did not contain a recognizable Personalize project UID field.");
  }

  uid = await tryDiscoverPersonalizeProjectUid(authtoken);
  if (uid) {
    process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID = uid;
    process.env.CONTENTSTACK_PERSONALIZE_PROJECT_UID = uid;
    return uid;
  }
  hints.push(
    `Tried listing projects on: ${[process.env.CONTENTSTACK_PERSONALIZE_MANAGEMENT_URL, inferPersonalizeManagementBaseFromStackApiUrl(), "https://personalize-api.contentstack.com"].filter(Boolean).join(", ")} (best-effort; many stacks omit this).`
  );

  try {
    const { csClient } = await import("./csClient.js");
    for (const path of ["/stacks/settings", "/stacks"]) {
      const r = await csClient.get(path, { validateStatus: () => true });
      hints.push(`CMA GET ${path}: HTTP ${r.status}`);
      if (r.status >= 400) continue;
      const stack = r.data?.stack || r.data?.stacks?.[0] || r.data;
      uid = walkForUid(stack, /personalize|personalize_project|project_uid|personalizeProject/i);
      if (uid) {
        process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID = uid;
        process.env.CONTENTSTACK_PERSONALIZE_PROJECT_UID = uid;
        return uid;
      }
    }
  } catch (e) {
    hints.push(`CMA stack fetch error: ${e.message}`);
  }

  throw new Error(
    [
      "Could not determine Personalize Project UID.",
      "Set NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID in .env.local (Personalize → Project → Settings → General),",
      "or create/link a Personalize project in the Contentstack UI so list APIs return it.",
      "The public Personalize Management OpenAPI does not document project list/create; this script only tries common paths.",
      "",
      "Diagnostics:",
      ...hints.map((h) => `  • ${h}`),
    ].join("\n")
  );
}
