import "dotenv/config";
import { csClient } from "./csClient.js";

/**
 * 📤 Publish ALL entries across ALL content types to the configured environment.
 *
 * Content types published (in order):
 *   1. genre
 *   2. anime
 *   3. manga
 *   4. episode
 *   5. daily_update
 *   6. homepage
 *
 * Note: "order" entries are NOT auto-published (created at runtime via the frontend).
 */

const ENVIRONMENT = process.env.CONTENTSTACK_ENVIRONMENT || "development";
const RATE_LIMIT_MS = 400; // ms between publish calls to avoid 429s

async function publishEntry(contentTypeUid, entryUid, title) {
  try {
    await csClient.post(`/content_types/${contentTypeUid}/entries/${entryUid}/publish`, {
      entry: {
        environments: [ENVIRONMENT],
        locales: ["en-us"],
      },
    });
    console.log(`  ✅ Published: ${title}`);
    return true;
  } catch (error) {
    const errorMsg = error.response?.data?.error_message || error.message;
    if (errorMsg.includes("already published")) {
      console.log(`  ⏭ Already published: ${title}`);
      return true;
    }
    console.error(`  ❌ Failed to publish ${title}:`, errorMsg);
    return false;
  }
}

/**
 * Generic function to publish all entries of a given content type
 */
async function publishAllOfType(contentTypeUid, label) {
  console.log(`\n📤 Publishing ${label}`);
  console.log("====================================\n");

  try {
    // Fetch entries (paginate if needed)
    let allEntries = [];
    let skip = 0;
    const limit = 100;

    while (true) {
      const response = await csClient.get(`/content_types/${contentTypeUid}/entries`, {
        params: { limit, skip },
      });

      const entries = response.data.entries || [];
      allEntries = allEntries.concat(entries);

      if (entries.length < limit) break;
      skip += limit;
    }

    console.log(`Found ${allEntries.length} ${label.toLowerCase()} entries\n`);

    if (allEntries.length === 0) {
      console.log(`  ⏭ No entries to publish\n`);
      return { published: 0, failed: 0, total: 0 };
    }

    let published = 0;
    let failed = 0;

    for (const entry of allEntries) {
      const success = await publishEntry(contentTypeUid, entry.uid, entry.title);
      if (success) {
        published++;
      } else {
        failed++;
      }
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }

    console.log(`\n  ✅ Published: ${published}  ❌ Failed: ${failed}`);
    return { published, failed, total: allEntries.length };
  } catch (error) {
    console.error(`Error fetching ${label}:`, error.response?.data?.error_message || error.message);
    return { published: 0, failed: 0, total: 0 };
  }
}

// ================================================
// MAIN
// ================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║        📤 Publish All Entries                      ║");
  console.log(`║        Environment: ${ENVIRONMENT.padEnd(31)}║`);
  console.log("╚════════════════════════════════════════════════════╝");

  // Order matters: genres first (referenced by anime), then anime (referenced by episodes/homepage)
  const contentTypes = [
    { uid: "genre",        label: "Genre" },
    { uid: "anime",        label: "Anime" },
    { uid: "manga",        label: "Manga" },
    { uid: "episode",      label: "Episode" },
    { uid: "daily_update", label: "Daily Update" },
    { uid: "homepage",     label: "Homepage" },
  ];

  const summary = [];

  for (const ct of contentTypes) {
    const result = await publishAllOfType(ct.uid, ct.label);
    summary.push({ ...ct, ...result });
  }

  // Print summary
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║               📊 Publish Summary                  ║");
  console.log("╠════════════════════════════════════════════════════╣");

  let totalPublished = 0;
  let totalFailed = 0;

  for (const s of summary) {
    const line = `  ${s.label.padEnd(15)} ${String(s.published).padStart(3)} published  ${String(s.failed).padStart(3)} failed  (${s.total} total)`;
    console.log(`║${line.padEnd(52)}║`);
    totalPublished += s.published;
    totalFailed += s.failed;
  }

  console.log("╠════════════════════════════════════════════════════╣");
  console.log(`║  Total: ${totalPublished} published, ${totalFailed} failed${" ".repeat(Math.max(0, 28 - String(totalPublished).length - String(totalFailed).length))}║`);
  console.log("╚════════════════════════════════════════════════════╝");
  console.log("\n🎉 Publishing complete!");
}

main();
