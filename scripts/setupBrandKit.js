import axios from "axios";
import { loadEnvLocal } from "./loadEnvLocal.js";
import {
  normalizeContentstackUid,
  resolveAuthtoken,
  resolveOrganizationUid,
} from "./userSession.js";

/**
 * Creates a Brand Kit + AniBot voice profile via Brand Kit Management API.
 * @see https://www.contentstack.com/docs/developers/apis/brand-kit-management-api/
 *
 * Voice profiles (non-prod / nested style):
 *   GET|POST {BASE}/v1/brand-kits/{brandKitUid}/voice-profiles
 * Example: https://stag-azure-na-brand-kits-api.csnonprod.com/v1/brand-kits/csa33f28a5cf9942/voice-profiles
 *
 * Auth: CONTENTSTACK_AUTHTOKEN **or** CONTENTSTACK_ACCOUNT_EMAIL + CONTENTSTACK_ACCOUNT_PASSWORD
 * Org: CONTENTSTACK_ORGANIZATION_UID **or** derived from the user session API
 * Stack: CONTENTSTACK_API_KEY (links the Brand Kit to your stack)
 *
 * Optional: CONTENTSTACK_BRAND_KIT_API_URL (else inferred from CONTENTSTACK_BASE_URL for *-api.csnonprod.com)
 */

loadEnvLocal();

function inferBrandKitBaseFromManagementUrl() {
  const u = (process.env.CONTENTSTACK_BASE_URL || "").replace(/\/$/, "");
  const m = u.match(/^https?:\/\/([\w.-]+?)-api(\.[\w.-]+)\/v3$/i);
  if (!m) return null;
  const host = `${m[1]}-brand-kits-api${m[2]}`;
  return `https://${host}`;
}

const BASE = (
  process.env.CONTENTSTACK_BRAND_KIT_API_URL ||
  inferBrandKitBaseFromManagementUrl() ||
  "https://brand-kits-api.contentstack.com"
).replace(/\/$/, "");

const BRAND_KIT_NAME = process.env.CONTENTSTACK_BRAND_KIT_NAME || "AniVerse Brand Kit";
const VOICE_NAME = process.env.CONTENTSTACK_VOICE_PROFILE_NAME || "AniBot";

const ANIBOT_DESCRIPTION =
  process.env.CONTENTSTACK_ANIBOT_SYSTEM_PROMPT ||
  "You are AniBot, an enthusiastic anime and manga expert. You ONLY answer questions about anime and manga. If asked about anything else, politely redirect to anime/manga topics. Use a friendly, knowledgeable tone.";

function orgClient(orgUid, authtoken) {
  return axios.create({
    baseURL: `${BASE}/v1`,
    headers: {
      "Content-Type": "application/json",
      organization_uid: orgUid,
      authtoken,
    },
    validateStatus: () => true,
  });
}

/** Nested: /v1/brand-kits/{uid}/voice-profiles (staging / Azure NA non-prod). */
function brandKitScopedClient(orgUid, brandKitUid, authtoken) {
  return axios.create({
    baseURL: `${BASE}/v1/brand-kits/${brandKitUid}`,
    headers: {
      "Content-Type": "application/json",
      organization_uid: orgUid,
      authtoken,
    },
    validateStatus: () => true,
  });
}

/** Legacy: flat /v1/voice-profiles + brand_kit_uid header (some regions). */
function voiceClientLegacy(orgUid, brandKitUid, authtoken) {
  return axios.create({
    baseURL: `${BASE}/v1`,
    headers: {
      "Content-Type": "application/json",
      organization_uid: orgUid,
      brand_kit_uid: brandKitUid,
      authtoken,
    },
    validateStatus: () => true,
  });
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.brand_kits)) return data.brand_kits;
  if (Array.isArray(data?.voice_profiles)) return data.voice_profiles;
  return data?.items || [];
}

/** Single-quote for safe POSIX `sh` / `curl -H` copy-paste. */
function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function logBrandKitListCurl(orgUid, authtoken) {
  const url = `${BASE}/v1/brand-kits`;
  const curl = [
    `curl -sS -X GET ${shQuote(url)} \\`,
    `  -H ${shQuote("Content-Type: application/json")} \\`,
    `  -H ${shQuote(`organization_uid: ${orgUid}`)} \\`,
    `  -H ${shQuote(`authtoken: ${authtoken}`)}`,
  ].join("\n");
  console.log("\n📋 Equivalent curl (GET /v1/brand-kits) — contains secrets; do not share:\n");
  console.log(curl);
  console.log("");
}

function logVoiceProfilesListCurl(orgUid, brandKitUid, authtoken) {
  const url = `${BASE}/v1/brand-kits/${brandKitUid}/voice-profiles`;
  const curl = [
    `curl -sS -X GET ${shQuote(url)} \\`,
    `  -H ${shQuote("Content-Type: application/json")} \\`,
    `  -H ${shQuote(`organization_uid: ${orgUid}`)} \\`,
    `  -H ${shQuote(`authtoken: ${authtoken}`)}`,
  ].join("\n");
  console.log("\n📋 Equivalent curl (GET …/brand-kits/{uid}/voice-profiles):\n");
  console.log(curl);
  console.log("");
}

async function getVoiceProfilesList(orgUid, brandKitUid, authtoken) {
  const scoped = brandKitScopedClient(orgUid, brandKitUid, authtoken);
  for (const path of ["/voice-profiles", "/voice_profiles"]) {
    const res = await scoped.get(path);
    if (res.status < 400) return res;
  }
  const legacy = voiceClientLegacy(orgUid, brandKitUid, authtoken);
  for (const path of ["/voice-profiles", "/voice_profiles"]) {
    const res = await legacy.get(path);
    if (res.status < 400) return res;
  }
  return { status: 404, data: {} };
}

async function postVoiceProfile(orgUid, brandKitUid, authtoken, body) {
  const scoped = brandKitScopedClient(orgUid, brandKitUid, authtoken);
  for (const path of ["/voice-profiles", "/voice_profiles"]) {
    const res = await scoped.post(path, body);
    if (res.status < 400) return res;
  }
  const legacy = voiceClientLegacy(orgUid, brandKitUid, authtoken);
  for (const path of ["/voice-profiles", "/voice_profiles"]) {
    const res = await legacy.post(path, body);
    if (res.status < 400) return res;
  }
  return { status: 400, data: {} };
}

async function main() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   Brand Kit Management API — AniVerse defaults     ║");
  console.log("╚════════════════════════════════════════════════════╝\n");
  console.log("🌐 Brand Kit API base:", BASE);

  const apiKey = process.env.CONTENTSTACK_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing CONTENTSTACK_API_KEY in .env.local");
    process.exit(1);
  }

  const authtoken = await resolveAuthtoken();
  const orgUid = normalizeContentstackUid(await resolveOrganizationUid(authtoken));
  if (!orgUid) {
    console.error("Could not resolve a valid organization UID.");
    process.exit(1);
  }

  console.log("🔑 Organization UID:", orgUid);
  console.log("");

  const api = orgClient(orgUid, authtoken);

  logBrandKitListCurl(orgUid, authtoken);

  const { data: list, status: ls } = await api.get("/brand-kits");
  if (ls >= 400) {
    console.error("GET /brand-kits failed:", ls, list);
    console.error("Set CONTENTSTACK_BRAND_KIT_API_URL (e.g. https://stag-azure-na-brand-kits-api.csnonprod.com).");
    process.exit(1);
  }

  const kits = unwrapList(list);
  let kit = kits.find((k) => (k.name || k.brand_kit?.name) === BRAND_KIT_NAME);
  let brandKitUid = kit?.uid || kit?.brand_kit?.uid;

  if (!brandKitUid) {
    const { data: created, status: c } = await api.post("/brand-kits", {
      brand_kit: {
        name: BRAND_KIT_NAME,
        description: "AniVerse DXP — Brand Kit for AniBot and generative features",
        api_keys: [apiKey],
      },
    });
    if (c >= 400) {
      console.error("POST /brand-kits failed:", c, created);
      process.exit(1);
    }
    brandKitUid = created.brand_kit?.uid || created.uid;
    console.log("✓ Created Brand Kit:", brandKitUid);
  } else {
    console.log("✓ Brand Kit already exists:", brandKitUid);
  }

  logVoiceProfilesListCurl(orgUid, brandKitUid, authtoken);

  const vlistRes = await getVoiceProfilesList(orgUid, brandKitUid, authtoken);
  if (vlistRes.status >= 400) {
    console.error("GET voice profiles failed:", vlistRes.status, vlistRes.data);
    process.exit(1);
  }
  const profiles = unwrapList(vlistRes.data);

  let voice = profiles.find((p) => (p.name || p.voice_profile?.name) === VOICE_NAME);
  let voiceUid = voice?.uid || voice?.voice_profile?.uid;

  const voiceBody = {
    voice_profile: {
      name: VOICE_NAME,
      description: ANIBOT_DESCRIPTION,
      communication_style: {
        formality_level: 3,
        tone: 4,
        humor_level: 3,
        complexity_level: 2,
      },
    },
  };

  if (!voiceUid) {
    const { data: vcreated, status: vc } = await postVoiceProfile(
      orgUid,
      brandKitUid,
      authtoken,
      voiceBody
    );
    if (vc >= 400) {
      console.error("POST voice profile failed:", vc, vcreated);
      process.exit(1);
    }
    voiceUid = vcreated.voice_profile?.uid || vcreated.uid;
    console.log("✓ Created voice profile:", voiceUid);
  } else {
    console.log("✓ Voice profile already exists:", voiceUid);
  }

  console.log("\nAdd or merge into .env.local:");
  console.log(`  CONTENTSTACK_BRAND_KIT_API_URL=${BASE}`);
  console.log(`  CONTENTSTACK_ORGANIZATION_UID=${orgUid}`);
  console.log(`  CONTENTSTACK_BRAND_KIT_UID=${brandKitUid}`);
  console.log(`  CONTENTSTACK_ANIBOT_VOICE_PROFILE_UID=${voiceUid}`);
  console.log("\nAutomate: npm run setup-automate (project), then npm run setup-automate -- import. Chat: CONTENTSTACK_AUTOMATION_URL.");
  console.log("Docs: https://www.contentstack.com/docs/developers/apis/brand-kit-management-api/");
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
