import "dotenv/config";
import { csClient } from "./csClient.js";

/**
 * 🏠 Homepage + Personalize Setup Script
 * 
 * This script:
 * 1. Tags all anime entries with audience_tag (kids / normal / all)
 * 2. Creates the "Normal" homepage entry (base entry)
 * 3. Creates the "Kids" homepage variant
 * 4. Links featured anime per audience
 * 5. Publishes everything
 */

const ENV = process.env.CONTENTSTACK_ENVIRONMENT || "production";
const DELAY = 1000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ================================================
// AUDIENCE TAGGING RULES
// ================================================

// Genres that are NOT safe for kids
const KIDS_BLOCKED_GENRES = [
  "action", "horror", "psychological", "thriller",
  "ecchi", "violence", "mature", "seinen", "josei",
  "suspense", "avant garde", "award winning",
];

// Keywords in titles/descriptions that suggest adult content
const ADULT_KEYWORDS = [
  "death", "kill", "blood", "gore", "war", "revenge",
  "murder", "dark", "demon", "hell", "attack",
];

// Keywords that suggest kid-friendly content
const KIDS_KEYWORDS = [
  "comedy", "adventure", "fantasy", "slice of life",
  "family", "friendship", "school", "sports", "music",
];

/**
 * Determine audience tag for an anime based on its genres
 */
function determineAudienceTag(anime) {
  const genres = anime.genres || [];
  const genreNames = genres.map(g => {
    if (typeof g === "string") return g.toLowerCase();
    return (g.title || g.name || "").toLowerCase();
  });

  const title = (anime.title || "").toLowerCase();
  const description = (anime.description || anime.synopsis || "").toLowerCase();

  // Check if any genre is blocked for kids
  const hasBlockedGenre = genreNames.some(genre =>
    KIDS_BLOCKED_GENRES.some(blocked => genre.includes(blocked))
  );

  // Check for adult keywords
  const hasAdultKeyword = ADULT_KEYWORDS.some(kw =>
    title.includes(kw) || description.includes(kw)
  );

  // Check for kid-friendly keywords
  const hasKidsKeyword = genreNames.some(genre =>
    KIDS_KEYWORDS.some(kw => genre.includes(kw))
  );

  if (hasBlockedGenre || hasAdultKeyword) {
    return "normal"; // Only for normal/adult audience
  }
  
  if (hasKidsKeyword && !hasBlockedGenre) {
    return "all"; // Safe for everyone including kids
  }

  return "all"; // Default: show to everyone
}

// ================================================
// STEP 1: Tag all anime entries with audience
// ================================================

async function tagAnimeWithAudience() {
  console.log("\n🏷️  Step 1: Tagging Anime with Audience Tags");
  console.log("──────────────────────────────────────────────");

  const response = await csClient.get("/content_types/anime/entries", {
    params: { limit: 100, include: ["genres"] },
  });

  const animeList = response.data.entries || [];
  console.log(`Found ${animeList.length} anime entries\n`);

  const stats = { all: 0, kids: 0, normal: 0 };

  for (const anime of animeList) {
    const tag = determineAudienceTag(anime);
    stats[tag]++;

    // Skip if already tagged
    if (anime.audience_tag === tag) {
      console.log(`  ⏭ ${anime.title} → already tagged '${tag}'`);
      continue;
    }

    try {
      await csClient.put(`/content_types/anime/entries/${anime.uid}`, {
        entry: { audience_tag: tag },
      });
      console.log(`  ✅ ${anime.title} → '${tag}'`);
    } catch (error) {
      console.error(`  ❌ ${anime.title}:`, error.response?.data?.error_message || error.message);
    }

    await wait(500);
  }

  console.log(`\n📊 Audience Distribution:`);
  console.log(`  🌐 all (everyone): ${stats.all}`);
  console.log(`  👶 kids only: ${stats.kids}`);
  console.log(`  🔞 normal only: ${stats.normal}`);

  return animeList;
}

// ================================================
// STEP 2: Create Homepage Base Entry (Normal variant)
// ================================================

async function createHomepageEntry(animeList) {
  console.log("\n🏠 Step 2: Creating Homepage Entry (Normal - Base)");
  console.log("──────────────────────────────────────────────────");

  // Check if homepage already exists
  try {
    const existing = await csClient.get("/content_types/homepage/entries", {
      params: { limit: 1 },
    });

    if (existing.data.entries && existing.data.entries.length > 0) {
      console.log("  ⏭ Homepage entry already exists, updating...");
      const entry = existing.data.entries[0];
      
      // Get featured anime for Normal profile (all + normal tagged)
      const normalFeatured = animeList
        .filter(a => a.audience_tag !== "kids")
        .slice(0, 8)
        .map(a => ({ uid: a.uid, _content_type_uid: "anime" }));

      await csClient.put(`/content_types/homepage/entries/${entry.uid}`, {
        entry: {
          title: "AniVerse Homepage",
          hero_title_line1: "Discover Your",
          hero_title_line2: "Next Anime",
          hero_subtitle: "Explore a curated collection of the best anime, from timeless classics to the latest releases. Your journey into the anime universe starts here.",
          primary_button_text: "Browse Collection",
          primary_button_link: "/anime",
          secondary_button_text: "Explore Genres",
          secondary_button_link: "/genres",
          featured_section_title: "Top Rated Anime",
          featured_section_subtitle: "Discover the highest-rated anime in our collection",
          featured_anime: normalFeatured,
          cta_title: "Ready to Start Watching?",
          cta_description: "Explore our complete collection of anime and find your next favorite series.",
          cta_button_text: "Start Exploring",
          cta_button_link: "/anime",
          theme_gradient: "from-aurora to-stardust",
        },
      });

      console.log("  ✅ Homepage entry updated (Normal variant)");
      return entry.uid;
    }
  } catch (error) {
    // Content type might not exist yet or no entries
  }

  // Get featured anime for Normal profile
  const normalFeatured = animeList
    .filter(a => {
      const tag = determineAudienceTag(a);
      return tag === "all" || tag === "normal";
    })
    .slice(0, 8)
    .map(a => ({ uid: a.uid, _content_type_uid: "anime" }));

  try {
    const res = await csClient.post("/content_types/homepage/entries", {
      entry: {
        title: "AniVerse Homepage",
        hero_title_line1: "Discover Your",
        hero_title_line2: "Next Anime",
        hero_subtitle: "Explore a curated collection of the best anime, from timeless classics to the latest releases. Your journey into the anime universe starts here.",
        primary_button_text: "Browse Collection",
        primary_button_link: "/anime",
        secondary_button_text: "Explore Genres",
        secondary_button_link: "/genres",
        featured_section_title: "Top Rated Anime",
        featured_section_subtitle: "Discover the highest-rated anime in our collection",
        featured_anime: normalFeatured,
        cta_title: "Ready to Start Watching?",
        cta_description: "Explore our complete collection of anime and find your next favorite series.",
        cta_button_text: "Start Exploring",
        cta_button_link: "/anime",
        theme_gradient: "from-aurora to-stardust",
      },
    });

    console.log("  ✅ Homepage entry created (Normal - base)");
    return res.data.entry.uid;
  } catch (error) {
    console.error("  ❌ Failed:", error.response?.data?.error_message || error.message);
    if (error.response?.data?.errors) {
      console.error("  Details:", JSON.stringify(error.response.data.errors, null, 2));
    }
    return null;
  }
}

// ================================================
// STEP 3: Create Kids Variant of Homepage
// ================================================

async function createKidsVariant(homepageUid, animeList) {
  console.log("\n👶 Step 3: Creating Kids Variant of Homepage");
  console.log("──────────────────────────────────────────────");

  if (!homepageUid) {
    console.log("  ❌ No homepage entry UID, skipping variant creation");
    return;
  }

  // Get kid-friendly anime (audience_tag = 'all' or 'kids')
  const kidsFeatured = animeList
    .filter(a => {
      const tag = determineAudienceTag(a);
      return tag === "all" || tag === "kids";
    })
    .slice(0, 8)
    .map(a => ({ uid: a.uid, _content_type_uid: "anime" }));

  console.log(`  📺 Found ${kidsFeatured.length} kid-friendly featured anime`);

  // Note: Creating entry variants via the Management API requires Personalize
  // to be set up first. The variant is created by passing the variant UID header.
  // Since Personalize needs manual setup, we'll log the Kids variant data
  // that should be used when creating the variant in the UI.

  console.log("\n  📋 Kids Variant Content (apply in Contentstack UI or via Personalize API):");
  console.log("  ─────────────────────────────────────────────────────────────────────────");
  
  const kidsVariantData = {
    hero_title_line1: "Welcome to",
    hero_title_line2: "AniVerse Kids!",
    hero_subtitle: "Fun and safe anime adventures for young viewers. Discover exciting stories perfect for kids!",
    primary_button_text: "Let's Watch!",
    primary_button_link: "/anime",
    secondary_button_text: "Fun Genres",
    secondary_button_link: "/genres",
    featured_section_title: "Top Picks for Kids",
    featured_section_subtitle: "Fun and exciting anime perfect for young viewers",
    featured_anime: kidsFeatured,
    cta_title: "Ready for an Adventure?",
    cta_description: "Explore fun and exciting anime perfect for kids. Start watching now!",
    cta_button_text: "Start Watching!",
    cta_button_link: "/anime",
    theme_gradient: "from-pink-500 to-purple-500",
  };

  console.log(`  hero_title_line1: "${kidsVariantData.hero_title_line1}"`);
  console.log(`  hero_title_line2: "${kidsVariantData.hero_title_line2}"`);
  console.log(`  hero_subtitle: "${kidsVariantData.hero_subtitle}"`);
  console.log(`  primary_button_text: "${kidsVariantData.primary_button_text}"`);
  console.log(`  featured_section_title: "${kidsVariantData.featured_section_title}"`);
  console.log(`  featured_anime: ${kidsFeatured.length} kid-friendly anime`);
  console.log(`  cta_title: "${kidsVariantData.cta_title}"`);
  console.log(`  theme_gradient: "${kidsVariantData.theme_gradient}"`);

  // Try to create the variant via API (requires Personalize variant UID)
  const variantUid = process.env.CONTENTSTACK_KIDS_VARIANT_UID;
  
  if (variantUid) {
    try {
      await csClient.put(
        `/content_types/homepage/entries/${homepageUid}`,
        { entry: kidsVariantData },
        { headers: { "x-cs-variant-uid": variantUid } }
      );
      console.log("\n  ✅ Kids variant created via API!");
    } catch (error) {
      console.error("\n  ⚠️  Could not create variant via API:", error.response?.data?.error_message || error.message);
      console.log("  → Create the variant manually in Contentstack Personalize UI");
    }
  } else {
    console.log("\n  ℹ️  To create the Kids variant automatically:");
    console.log("  1. Set up Personalize in Contentstack UI");
    console.log("  2. Create an Experience with 'Kids' and 'Normal' variations");
    console.log("  3. Add CONTENTSTACK_KIDS_VARIANT_UID to your .env");
    console.log("  4. Re-run this script");
  }

  return kidsVariantData;
}

// ================================================
// STEP 4: Publish Homepage
// ================================================

async function publishHomepage(homepageUid) {
  console.log("\n📤 Step 4: Publishing Homepage");
  console.log("──────────────────────────────────────────────");

  if (!homepageUid) {
    console.log("  ❌ No homepage entry to publish");
    return;
  }

  try {
    await csClient.post(`/content_types/homepage/entries/${homepageUid}/publish`, {
      entry: {
        environments: [ENV],
        locales: ["en-us"],
      },
    });
    console.log("  ✅ Homepage published to", ENV);
  } catch (error) {
    console.error("  ❌ Publish failed:", error.response?.data?.error_message || error.message);
  }
}

// ================================================
// STEP 5: Publish all anime (with new audience tags)
// ================================================

async function publishAllAnime() {
  console.log("\n📤 Step 5: Publishing Anime (with audience tags)");
  console.log("──────────────────────────────────────────────");

  const response = await csClient.get("/content_types/anime/entries", {
    params: { limit: 100 },
  });

  const animeList = response.data.entries || [];
  let published = 0;

  for (const anime of animeList) {
    try {
      await csClient.post(`/content_types/anime/entries/${anime.uid}/publish`, {
        entry: {
          environments: [ENV],
          locales: ["en-us"],
        },
      });
      console.log(`  ✅ ${anime.title}`);
      published++;
    } catch (error) {
      console.error(`  ❌ ${anime.title}:`, error.response?.data?.error_message || error.message);
    }
    await wait(300);
  }

  console.log(`\n  Published: ${published}/${animeList.length}`);
}

// ================================================
// MAIN
// ================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   🏠 Homepage + Personalize Setup                 ║");
  console.log("╚════════════════════════════════════════════════════╝");

  // Step 1: Tag anime
  const animeList = await tagAnimeWithAudience();
  await wait(DELAY);

  // Step 2: Create homepage entry
  const homepageUid = await createHomepageEntry(animeList);
  await wait(DELAY);

  // Step 3: Create kids variant data
  await createKidsVariant(homepageUid, animeList);
  await wait(DELAY);

  // Step 4: Publish homepage
  await publishHomepage(homepageUid);
  await wait(DELAY);

  // Step 5: Publish anime with tags
  await publishAllAnime();

  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║   ✅ Homepage Setup Complete                      ║");
  console.log("╠════════════════════════════════════════════════════╣");
  console.log("║                                                    ║");
  console.log("║   📌 Manual Steps in Contentstack UI:              ║");
  console.log("║                                                    ║");
  console.log("║   1. Go to Personalize → Create Project            ║");
  console.log("║   2. Add attribute: 'profile_type' (string)        ║");
  console.log("║   3. Create Audience 'Kids':                       ║");
  console.log("║      profile_type equals 'kids'                    ║");
  console.log("║   4. Create Audience 'Normal':                     ║");
  console.log("║      profile_type equals 'normal'                  ║");
  console.log("║   5. Create Experience on 'homepage':              ║");
  console.log("║      - Variant 'normal' → Normal audience          ║");
  console.log("║      - Variant 'kids'   → Kids audience            ║");
  console.log("║      (or run: npm run setup-personalize)            ║");
  console.log("║   6. Open Homepage entry → Switch to Kids variant  ║");
  console.log("║      → Apply the Kids content shown above          ║");
  console.log("║   Brand Kit + AniBot voice: npm run setup-brand-kit ║");
  console.log("║                                                    ║");
  console.log("╚════════════════════════════════════════════════════╝");
}

main().catch((err) => {
  console.error("💥 Failed:", err.message);
  process.exit(1);
});
