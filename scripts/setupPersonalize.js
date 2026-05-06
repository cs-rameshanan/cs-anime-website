import axios from "axios";
import { loadEnvLocal } from "./loadEnvLocal.js";
import {
  getPersonalizeProjectName,
  getUserSessionApiRoot,
  inferPersonalizeManagementBaseFromStackApiUrl,
  inferPersonalizeProjectsApiBaseFromStackUrl,
  resolveAuthtoken,
  resolveOrganizationUid,
  resolvePersonalizeProjectUid,
} from "./userSession.js";

/**
 * Provisions Personalize resources via the Personalize Management API.
 * @see https://www.contentstack.com/docs/developers/apis/personalize-management-api/
 *
 * Auth (automatic):
 * - Set CONTENTSTACK_ACCOUNT_EMAIL + CONTENTSTACK_ACCOUNT_PASSWORD in `.env.local`
 *   (or keep CONTENTSTACK_AUTHTOKEN if you already have a session token).
 *
 * Project UID:
 * - Prefer NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID / CONTENTSTACK_PERSONALIZE_PROJECT_UID
 * - Otherwise: list Personalize projects (best-effort), use one named CONTENTSTACK_PERSONALIZE_PROJECT_NAME
 *   (default "AniVerse"), or try an undocumented create; then user session / stack discovery.
 *
 * Optional: CONTENTSTACK_PERSONALIZE_MANAGEMENT_URL, CONTENTSTACK_USER_SESSION_BASE,
 *   CONTENTSTACK_PERSONALIZE_PROJECT_NAME
 *
 * Stack + CMS (after experiences exist):
 * - Link stack: PUT `{app}/personalize-api/projects/{projectUid}` with `connectedStackApiKey` (+ `organization_uid`).
 *   Base is inferred from CONTENTSTACK_BASE_URL / CONTENTSTACK_USER_SESSION_BASE, or set
 *   CONTENTSTACK_PERSONALIZE_PROJECTS_API_URL (e.g. https://stag-azure-na-app.csnonprod.com/personalize-api).
 * - CMA: link content types to the stack Variant Group that mirrors this experience
 *   (Content Management API — Variant Groups — “Link content types”):
 *   https://www.contentstack.com/docs/developers/apis/content-management-api#variant-groups
 * - Default content types: manga, anime, homepage (override with
 *   CONTENTSTACK_PERSONALIZE_LINKED_CONTENT_TYPES=comma,separated,uids)
 * - Branch-specific stacks: set CONTENTSTACK_BRANCH_UID (defaults to **main** for app CMA variant calls).
 * - App CMA base for variant groups: same host as the web app `…/api/v3` (see CONTENTSTACK_USER_SESSION_BASE),
 *   or set CONTENTSTACK_STACK_CMA_BASE explicitly.
 * - If the CMS never shows a matching variant group: link the stack in Personalize UI first,
 *   or set CONTENTSTACK_PERSONALIZE_VARIANT_GROUP_UID (or CONTENTSTACK_PERSONALIZE_VARIANT_GROUP_NAME).
 */

loadEnvLocal();

const BASE =
  process.env.CONTENTSTACK_PERSONALIZE_MANAGEMENT_URL ||
  inferPersonalizeManagementBaseFromStackApiUrl() ||
  "https://personalize-api.contentstack.com";

function buildClient(projectUid, authtoken) {
  const headers = {
    "Content-Type": "application/json",
    "x-project-uid": projectUid,
    authtoken,
  };
  const apiKey = process.env.CONTENTSTACK_API_KEY?.trim();
  if (apiKey) headers.api_key = apiKey;
  return axios.create({
    baseURL: BASE.replace(/\/$/, ""),
    headers,
    validateStatus: () => true,
  });
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/**
 * List/single responses sometimes wrap the record as `{ variant_group: { uid, name, … } }`.
 * Normalize so callers always see the inner object (with `uid`).
 */
function unwrapVariantGroupRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const nested = raw.variant_group;
  if (nested && typeof nested === "object" && (typeof nested.uid === "string" || typeof nested.name === "string")) {
    return nested;
  }
  if (typeof raw.uid === "string" || typeof raw.name === "string") return raw;
  return null;
}

/** Parse GET `/variant_groups/{uid}` response body into the variant group object, or null. */
function extractVariantGroupFromSingleResponse(responseData) {
  if (!responseData || typeof responseData !== "object") return null;
  const d1 = responseData.data?.variant_group;
  if (d1 && typeof d1 === "object") return unwrapVariantGroupRecord(d1);
  const d2 = responseData.variant_group;
  if (d2 && typeof d2 === "object") return unwrapVariantGroupRecord(d2);
  const inner = responseData.data;
  if (inner && typeof inner === "object") {
    const u = unwrapVariantGroupRecord(inner);
    if (u && typeof u.uid === "string") return u;
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Default content types attached to the experience’s variant group on the stack. */
const DEFAULT_LINKED_CONTENT_TYPE_UIDS = ["manga", "anime", "homepage"];

function getLinkedContentTypeUids() {
  const raw = process.env.CONTENTSTACK_PERSONALIZE_LINKED_CONTENT_TYPES?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_LINKED_CONTENT_TYPE_UIDS];
}

/**
 * Stack CMA on the **app** host (`…/api/v3`), matching the browser when editing variant groups.
 * Sends `branch` (defaults to `main`) like the web UI.
 */
function resolveAppStackCmaBaseUrl() {
  const explicit = process.env.CONTENTSTACK_STACK_CMA_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const sessionRoot = getUserSessionApiRoot().replace(/\/$/, "");
  if (/\/api\/v3$/i.test(sessionRoot)) return sessionRoot;
  if (/^https:\/\/api\.contentstack\.io\/v3$/i.test(sessionRoot)) {
    return "https://app.contentstack.com/api/v3";
  }
  const mg = (process.env.CONTENTSTACK_BASE_URL || "").replace(/\/$/, "");
  const m = mg.match(/^https?:\/\/([\w-]+)-api(\.[\w.-]+)\/v3$/i);
  if (m) return `https://${m[1]}-app${m[2]}/api/v3`;

  return sessionRoot;
}

function buildAppStackCmaClient(authtoken) {
  const apiKey = process.env.CONTENTSTACK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CONTENTSTACK_API_KEY is required for app-stack variant group API calls.");
  }
  const branch = process.env.CONTENTSTACK_BRANCH_UID?.trim() || "main";
  const headers = {
    "Content-Type": "application/json",
    api_key: apiKey,
    authtoken,
    branch,
  };
  const mt = process.env.CONTENTSTACK_MANAGEMENT_TOKEN?.trim();
  if (mt) headers.authorization = mt;
  return axios.create({
    baseURL: resolveAppStackCmaBaseUrl(),
    headers,
    validateStatus: () => true,
  });
}

function normalizeVariantGroupsPayload(data) {
  if (!data || typeof data !== "object") return [];
  const inner = data.data && typeof data.data === "object" ? data.data : data;
  const raw =
    inner.variant_groups ??
    inner.variantGroups ??
    inner.items ??
    (Array.isArray(inner) ? inner : null) ??
    data.variant_groups ??
    data.variantGroups ??
    data.items ??
    data;
  return asList(raw)
    .map((item) => {
      const u = unwrapVariantGroupRecord(item);
      if (u) return u;
      if (item && typeof item === "object" && typeof item.uid === "string") return item;
      return null;
    })
    .filter((g) => g && typeof g.uid === "string");
}

function normVariantGroupName(s) {
  if (s == null || typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Pick the stack variant group for this Personalize experience (name can differ slightly after sync).
 */
function pickVariantGroupUid(groups, { experienceName, experienceUid }) {
  if (!Array.isArray(groups) || !groups.length) return null;
  const target = normVariantGroupName(experienceName);
  if (!target) return null;

  const byExactCi = groups.find((g) => normVariantGroupName(g?.name) === target);
  if (byExactCi?.uid) return byExactCi.uid;

  const byContains = groups.find((g) => {
    const n = normVariantGroupName(g?.name);
    if (!n) return false;
    return n.includes(target) || target.includes(n);
  });
  if (byContains?.uid) return byContains.uid;

  const significant = target.split(" ").filter((w) => w.length > 2);
  if (significant.length >= 2) {
    const byTokens = groups.find((g) => {
      const n = normVariantGroupName(g?.name);
      return n && significant.every((t) => n.includes(t));
    });
    if (byTokens?.uid) return byTokens.uid;
  }

  if (experienceUid) {
    const byUidBlob = groups.find((g) => {
      try {
        return JSON.stringify(g).includes(experienceUid);
      } catch {
        return false;
      }
    });
    if (byUidBlob?.uid) return byUidBlob.uid;
  }

  return null;
}

/**
 * After the stack is linked to the Personalize project, CMS variant groups mirror experiences (same name in most cases).
 * Retries while sync lags; supports env overrides and loose name / experience-UID matching.
 */
async function findVariantGroupUidForExperience(cma, { experienceName, experienceUid }) {
  const forced = process.env.CONTENTSTACK_PERSONALIZE_VARIANT_GROUP_UID?.trim();
  if (forced) return forced;

  const name =
    process.env.CONTENTSTACK_PERSONALIZE_VARIANT_GROUP_NAME?.trim() || experienceName;

  const params = {
    limit: 100,
    include_variant_info: true,
    include_variant_count: true,
    desc: "updated_at",
  };
  let lastGroups = [];
  for (let attempt = 1; attempt <= 15; attempt++) {
    const { data, status } = await cma.get("/variant_groups", { params });
    if (status >= 400) {
      console.warn(`GET /variant_groups failed (${status}):`, JSON.stringify(data, null, 2).slice(0, 800));
      await sleep(3000);
      continue;
    }
    const groups = normalizeVariantGroupsPayload(data);
    lastGroups = groups;
    const uid = pickVariantGroupUid(groups, { experienceName: name, experienceUid });
    if (uid) return uid;

    if (attempt % 5 === 0) {
      const labels = groups
        .map((g) => (g?.name ? `"${g.name}"` : g?.uid ? `(uid ${g.uid})` : null))
        .filter(Boolean)
        .slice(0, 25);
      console.warn(
        `  [variant groups] attempt ${attempt}: ${groups.length} group(s) on stack${labels.length ? ` — ${labels.join(", ")}` : ""}`
      );
    }
    await sleep(3000);
  }

  if (!lastGroups.length) {
    console.warn(
      "  GET /variant_groups returned no groups. Link this stack to the Personalize project (Personalize → Project → Settings → Stack Connection), then re-run."
    );
  }
  return null;
}

/**
 * Link Personalize project to the stack (same contract as the Contentstack web app).
 * PUT `{projectsBase}/projects/{projectUid}` with JSON containing `connectedStackApiKey`.
 * Headers: `authtoken`, `organization_uid` (resolved or CONTENTSTACK_ORGANIZATION_UID).
 */
async function tryLinkPersonalizeProjectToStack(authtoken, personalizeApi, projectUid, stackApiKey) {
  const projectName = getPersonalizeProjectName();
  const body = {
    name: projectName,
    description: `${projectName} — stack link via scripts/setupPersonalize.js`,
    connectedStackApiKey: stackApiKey,
  };

  let orgUid = process.env.CONTENTSTACK_ORGANIZATION_UID?.trim() || null;
  if (!orgUid) {
    try {
      orgUid = await resolveOrganizationUid(authtoken);
    } catch {
      orgUid = null;
    }
  }

  const buildHeaders = (withOrg) => ({
    authtoken,
    "Content-Type": "application/json",
    ...(withOrg && orgUid ? { organization_uid: orgUid } : {}),
  });

  const bases = [];
  const push = (b) => {
    const t = b?.replace(/\/$/, "");
    if (t && !bases.includes(t)) bases.push(t);
  };
  push(inferPersonalizeProjectsApiBaseFromStackUrl());
  push(process.env.CONTENTSTACK_PERSONALIZE_PROJECTS_API_URL?.trim());

  let lastAppLinkError = null;
  for (const base of bases) {
    const url = `${base}/projects/${projectUid}`;
    for (const withOrg of [true, false]) {
      try {
        const { status, data } = await axios.put(url, body, {
          headers: buildHeaders(withOrg),
          validateStatus: () => true,
        });
        if (status < 400) {
          console.log(`✓ Personalize project ↔ stack: PUT ${url}`);
          return true;
        }
        lastAppLinkError = { status, data, url };
      } catch (e) {
        lastAppLinkError = { status: "network", data: e?.message || String(e), url };
      }
    }
  }
  if (lastAppLinkError && bases.length) {
    console.warn(
      `  App personalize-api link last attempt (${lastAppLinkError.url}): HTTP ${lastAppLinkError.status}`,
      typeof lastAppLinkError.data === "object"
        ? JSON.stringify(lastAppLinkError.data, null, 2).slice(0, 500)
        : lastAppLinkError.data
    );
  }

  const mgBase = (personalizeApi.defaults && personalizeApi.defaults.baseURL) || "";
  const fallbackBody = { ...body, connectedStackApiKey: stackApiKey };
  const fallbackAttempts = [
    ["put", `/projects/${projectUid}`, fallbackBody],
    ["put", `/projects/${projectUid}`, { stack_api_key: stackApiKey }],
  ];
  for (const [method, path, payload] of fallbackAttempts) {
    try {
      const { status } = await personalizeApi.request({ method, url: path, data: payload });
      if (status < 400) {
        console.log(`✓ Personalize project ↔ stack: ${method.toUpperCase()} ${mgBase}${path}`);
        return true;
      }
    } catch {
      /* try next */
    }
  }

  console.warn(
    "Could not link Personalize project to the stack via API. Set CONTENTSTACK_PERSONALIZE_PROJECTS_API_URL or CONTENTSTACK_ORGANIZATION_UID, or link in UI: Personalize → Project → Settings → Stack Connection."
  );
  return false;
}

async function fetchVariantGroupDocumentFromList(cma, variantGroupUid) {
  const params = {
    limit: 100,
    include_variant_info: true,
    include_variant_count: true,
    desc: "updated_at",
  };
  const { data, status } = await cma.get("/variant_groups", { params });
  if (status >= 400) return null;
  const groups = normalizeVariantGroupsPayload(data);
  return groups.find((g) => g.uid === variantGroupUid) || null;
}

async function fetchVariantGroupDocument(cma, variantGroupUid) {
  const { data, status } = await cma.get(`/variant_groups/${variantGroupUid}`);
  let doc = null;
  if (status < 400) {
    doc = extractVariantGroupFromSingleResponse(data);
    if (doc && typeof doc === "object") return doc;
  }
  doc = await fetchVariantGroupDocumentFromList(cma, variantGroupUid);
  if (doc) return doc;

  const base = cma.defaults?.baseURL || "";
  const snippet =
    data === undefined || data === null
      ? "(no body)"
      : typeof data === "object"
        ? JSON.stringify(data).slice(0, 1200)
        : String(data).slice(0, 400);
  console.error(
    `GET /variant_groups/${variantGroupUid} failed or unparsable (HTTP ${status}). Base: ${base}. Body (truncated): ${snippet}`
  );
  return null;
}

function contentTypeUidFromEntry(x) {
  if (x == null) return null;
  if (typeof x === "string") return x.trim() || null;
  if (typeof x === "object" && typeof x.uid === "string") return x.uid.trim() || null;
  return null;
}

/** Merge desired UIDs with existing variant_group.content_types (strings or {uid,status}). */
function buildMergedContentTypesForVariantGroup(existingRaw, desiredUids) {
  const linkedObjs = desiredUids.map((uid) => ({ uid, status: "linked" }));
  const list = Array.isArray(existingRaw) ? existingRaw : [];
  const byUid = new Map();
  for (const item of list) {
    const uid = contentTypeUidFromEntry(item);
    if (!uid) continue;
    if (typeof item === "object" && item !== null && "status" in item) {
      byUid.set(uid, { uid, status: item.status });
    } else {
      byUid.set(uid, { uid, status: "linked" });
    }
  }
  for (const o of linkedObjs) {
    if (!byUid.has(o.uid)) byUid.set(o.uid, o);
  }
  return [...byUid.values()];
}

/**
 * CMA (app host) — Link content types the same way the web UI does:
 * **PUT `/variant_groups/{uid}/variants`** with a full variant-group JSON (not `PUT /variant_groups/{uid}` alone).
 * `content_types` is an array of `{ uid, status: "linked" }`. Preserves `personalize_metadata`, `variants`, etc.
 */
async function linkContentTypesToVariantGroup(appCma, variantGroupUid, contentTypeUids) {
  const inner = await fetchVariantGroupDocument(appCma, variantGroupUid);
  if (!inner || typeof inner !== "object") {
    console.error(
      "Could not load variant group for uid:",
      variantGroupUid,
      "— confirm CONTENTSTACK_BRANCH_UID matches the branch where the group exists; CONTENTSTACK_PERSONALIZE_VARIANT_GROUP_UID must be the stack variant group UID (from GET /variant_groups), not the Personalize experience UID."
    );
    process.exit(1);
  }
  const groupName = (typeof inner.name === "string" && inner.name.trim()) || EXPERIENCE_NAME;
  const existingCt = inner.content_types ?? inner.linked_content_types ?? [];
  const mergedLinked = buildMergedContentTypesForVariantGroup(existingCt, contentTypeUids);
  const linkedObjects = mergedLinked.map((x) => ({
    uid: String(x.uid),
    status: typeof x.status === "string" ? x.status : "linked",
  }));

  let putPayload;
  try {
    putPayload = JSON.parse(
      JSON.stringify({
        ...inner,
        name: inner.name || groupName,
        content_types: linkedObjects,
      })
    );
  } catch {
    putPayload = { ...inner, name: inner.name || groupName, content_types: linkedObjects };
  }

  const variantsPath = `/variant_groups/${variantGroupUid}/variants`;
  let { status, data } = await appCma.put(variantsPath, putPayload);
  if (status < 400) {
    console.log(`✓ Linked content types on variant group "${putPayload.name}" via PUT ${variantsPath}`);
    return;
  }

  const minimal = {
    uid: variantGroupUid,
    name: putPayload.name,
    content_types: linkedObjects,
    personalize_metadata: inner.personalize_metadata,
    variants: inner.variants,
    variant_uids: inner.variant_uids,
    variant_count: inner.variant_count,
    unlinked_content_types: Array.isArray(inner.unlinked_content_types) ? inner.unlinked_content_types : [],
  };
  ({ status, data } = await appCma.put(variantsPath, minimal));
  if (status < 400) {
    console.log(`✓ Linked content types via PUT ${variantsPath} (minimal payload)`);
    return;
  }

  console.error("Linking content types failed. Last response:", status, JSON.stringify(data, null, 2));
  process.exit(1);
}

function audienceDefinition(attributeUid, value) {
  return {
    __type: "RuleCombination",
    combinationType: "AND",
    rules: [
      {
        __type: "Rule",
        attribute: { __type: "CustomAttributeReference", ref: attributeUid },
        attributeMatchCondition: "STRING_EQUALS",
        attributeMatchOptions: { __type: "StringMatchOptions", value },
        invertCondition: false,
      },
    ],
  };
}

async function ensureAttribute(api) {
  const { data, status } = await api.get("/attributes");
  if (status >= 400) {
    console.error("GET /attributes failed:", status, data);
    process.exit(1);
  }
  const existing = asList(data).find((a) => a.key === "profile_type");
  if (existing) {
    console.log("✓ Attribute profile_type already exists:", existing.uid);
    return existing.uid;
  }
  const { data: created, status: c2 } = await api.post("/attributes", {
    name: "Profile type",
    key: "profile_type",
    description: "kids | normal — synced from app profile switcher",
  });
  if (c2 >= 400) {
    console.error("POST /attributes failed:", c2, created);
    process.exit(1);
  }
  console.log("✓ Created attribute profile_type:", created.uid);
  return created.uid;
}

async function ensureAudience(api, name, attributeUid, matchValue) {
  const { data, status } = await api.get("/audiences");
  if (status >= 400) {
    console.error("GET /audiences failed:", status, data);
    process.exit(1);
  }
  const existing = asList(data).find((a) => a.name === name);
  if (existing) {
    console.log(`✓ Audience "${name}" already exists:`, existing.uid);
    return existing.uid;
  }
  const body = {
    name,
    description: `profile_type equals ${matchValue}`,
    definition: audienceDefinition(attributeUid, matchValue),
  };
  const { data: created, status: c2 } = await api.post("/audiences", body);
  if (c2 >= 400) {
    console.error(`POST /audiences (${name}) failed:`, c2, created);
    process.exit(1);
  }
  console.log(`✓ Created audience "${name}":`, created.uid);
  return created.uid;
}

const EXPERIENCE_NAME = "AniVerse Homepage profiles";

/**
 * Segmented experience variants for Kids vs Normal audiences.
 * Names must stay aligned with `profileToVariantAlias` in `lib/personalizedApi.js` ("kids" | "normal").
 */
function buildKidsNormalSegmentedVariants(kidsAudienceUid, normalAudienceUid) {
  return [
    {
      __type: "SegmentedVariant",
      name: "normal",
      audiences: [normalAudienceUid],
      audienceCombinationType: "AND",
    },
    {
      __type: "SegmentedVariant",
      name: "kids",
      audiences: [kidsAudienceUid],
      audienceCombinationType: "AND",
    },
  ];
}

/**
 * After a draft save, the API assigns each variant a `shortUid`. Re-attach those when activating
 * so the payload matches what the server expects on update.
 */
function mergeVariantShortUidsFromServer(serverVariants, desiredVariants) {
  if (!Array.isArray(serverVariants) || !Array.isArray(desiredVariants)) return desiredVariants;
  const byName = new Map();
  for (const sv of serverVariants) {
    if (sv && typeof sv.name === "string" && sv.shortUid != null && sv.shortUid !== "") {
      byName.set(sv.name, String(sv.shortUid));
    }
  }
  return desiredVariants.map((v) => {
    const shortUid = byName.get(v.name);
    return shortUid ? { ...v, shortUid } : v;
  });
}

/**
 * Personalize Management API — **Update an Experience Version**
 *
 * - **HTTP:** `PUT /experiences/{experienceUid}/versions/{versionUid}`
 * - **Docs:** https://www.contentstack.com/docs/developers/apis/personalize-management-api/
 * - **OpenAPI:** https://personalize-api.contentstack.com/openapi — `ExperienceVersionController_update`
 *
 * Failures such as `PUT experience version failed: 400 { errors: { variants: [...] } }` (see
 * terminal when running `node scripts/setupPersonalize.js`) are usually caused by invalid
 * **variant** payloads. In particular, the official examples tell you to **omit `shortUid`**
 * when creating or replacing variants so the server assigns Short UIDs; sending values like
 * `"0"` / `"1"` yourself often triggers `errors.variants` validation errors.
 *
 * Note: We do **not** fall back to `status: "DRAFT"` here. Once a version is ACTIVE, the API
 * rejects `DRAFT` with `personalize.EXPERIENCES.VERSIONS.CANNOT_MARK_VERSION_AS_DRAFT`.
 */
async function saveAndActivateSegmentedExperienceVersion(
  api,
  expUid,
  versionUid,
  kidsAudienceUid,
  normalAudienceUid
) {
  const variants = buildKidsNormalSegmentedVariants(kidsAudienceUid, normalAudienceUid);

  const putVersion = (body) =>
    api.put(`/experiences/${expUid}/versions/${versionUid}`, body);

  let { data: updated, status: u } = await putVersion({
    status: "ACTIVE",
    variants,
  });

  if (u >= 400) {
    const { data: verList, status: vg } = await api.get(`/experiences/${expUid}/versions`);
    if (vg >= 400) {
      console.error("GET /experiences/.../versions failed:", vg, JSON.stringify(verList, null, 2));
      process.exit(1);
    }
    const current = asList(verList).find((v) => v.uid === versionUid);
    const merged = mergeVariantShortUidsFromServer(current?.variants, variants);
    ({ data: updated, status: u } = await putVersion({
      status: "ACTIVE",
      variants: merged,
    }));
  }

  if (u >= 400) {
    console.error("PUT experience version failed (ACTIVE):", u, JSON.stringify(updated, null, 2));
    process.exit(1);
  }

  return updated;
}

async function ensureExperience(api, kidsAudienceUid, normalAudienceUid) {
  const { data, status } = await api.get("/experiences");
  if (status >= 400) {
    console.error("GET /experiences failed:", status, data);
    process.exit(1);
  }
  let exp = asList(data).find((e) => e.name === EXPERIENCE_NAME);
  if (!exp) {
    const { data: created, status: c2 } = await api.post("/experiences", {
      name: EXPERIENCE_NAME,
      description: "Maps Kids vs Normal profiles to homepage variants (see app profileToVariantAlias).",
      __type: "SEGMENTED",
    });
    if (c2 >= 400) {
      console.error("POST /experiences failed:", c2, created);
      process.exit(1);
    }
    exp = created;
    console.log("✓ Created experience:", exp.uid, "draft version:", exp.latestVersion);
  } else {
    console.log("✓ Experience already exists:", exp.uid, "latestVersion:", exp.latestVersion);
  }

  const expUid = exp.uid;
  const versionUid = exp.latestVersion;
  if (!versionUid) {
    console.error("Experience has no latestVersion; open Personalize UI and save a draft, then re-run.");
    process.exit(1);
  }

  await saveAndActivateSegmentedExperienceVersion(
    api,
    expUid,
    versionUid,
    kidsAudienceUid,
    normalAudienceUid
  );
  console.log("✓ Segmented variants (kids, normal) saved and experience version set ACTIVE.");

  const { data: verList, status: vg } = await api.get(`/experiences/${expUid}/versions`);
  if (vg < 400) {
    const current = asList(verList).find((v) => v.uid === versionUid);
    const names = (current?.variants || [])
      .map((x) => (x?.name ? `${x.name} (shortUid=${x.shortUid ?? "?"})` : null))
      .filter(Boolean);
    if (names.length) {
      console.log("  Variant Short UIDs (Edge SDK / manifest):", names.join(", "));
    }
  }

  return expUid;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   Personalize Management API — AniVerse defaults  ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  const authtoken = await resolveAuthtoken();
  const projectUid = await resolvePersonalizeProjectUid(authtoken);
  const fromEnv = !!(
    process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID?.trim() ||
    process.env.CONTENTSTACK_PERSONALIZE_PROJECT_UID?.trim()
  );
  console.log(
    "🔑 Using Personalize project:",
    projectUid,
    fromEnv ? "(from env)" : `(resolved; default name "${getPersonalizeProjectName()}" — CONTENTSTACK_PERSONALIZE_PROJECT_NAME)`
  );
  console.log("");

  const api = buildClient(projectUid, authtoken);
  const attrUid = await ensureAttribute(api);
  const kidsUid = await ensureAudience(api, "Kids", attrUid, "kids");
  const normalUid = await ensureAudience(api, "Normal", attrUid, "normal");
  const experienceUid = await ensureExperience(api, kidsUid, normalUid);

  const stackApiKey = process.env.CONTENTSTACK_API_KEY?.trim();
  if (stackApiKey) {
    console.log("\n── Stack: Personalize project + variant group content types ──");
    await tryLinkPersonalizeProjectToStack(authtoken, api, projectUid, stackApiKey);
    const appCma = buildAppStackCmaClient(authtoken);
    const vgUid = await findVariantGroupUidForExperience(appCma, {
      experienceName: EXPERIENCE_NAME,
      experienceUid,
    });
    if (!vgUid) {
      console.warn(
        `No matching variant group for experience "${EXPERIENCE_NAME}" (uid ${experienceUid}). Link the stack in Personalize (Project → Settings → Stack Connection), wait for sync, then re-run — or set CONTENTSTACK_PERSONALIZE_VARIANT_GROUP_UID / CONTENTSTACK_PERSONALIZE_VARIANT_GROUP_NAME.`
      );
    } else {
      console.log("✓ Variant group UID for this experience:", vgUid);
      await linkContentTypesToVariantGroup(appCma, vgUid, getLinkedContentTypeUids());
    }
  } else {
    console.warn("\nSkipping stack linking: set CONTENTSTACK_API_KEY to link the project and attach manga / anime / homepage.");
  }

  console.log("\n── Next steps ──");
  console.log("1. Ensure CMS entry variants exist where needed; set CONTENTSTACK_KIDS_VARIANT_UID and re-run: npm run setup-homepage");
  console.log("\nAPI reference: https://www.contentstack.com/docs/developers/apis/personalize-management-api/");
  console.log("Variant groups (CMA): https://www.contentstack.com/docs/developers/apis/content-management-api#variant-groups");
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
