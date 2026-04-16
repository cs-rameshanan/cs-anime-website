import "dotenv/config";
import { execSync } from "child_process";

/**
 * 🏗️ Master Setup Script - Build the Full DXP from Scratch
 * 
 * This single script runs every step in the correct order:
 * 
 * 1. Bootstrap → Create content types & environment
 * 2. Import Anime → Fetch from Jikan API & create entries (+ genres + episodes)
 * 3. Import Manga → Fetch from Jikan API & create manga entries
 * 4. Upload Anime Assets → Download posters & upload to Contentstack CDN
 * 5. Upload Manga Assets → Download covers & upload to Contentstack CDN
 * 6. Daily Update → Create today's daily update entry
 * 7. Publish → Publish all entries to development
 * 
 * Usage: npm run setup
 */

const steps = [
  {
    name: "Bootstrap Content Types & Environment",
    command: "node anime-website/scripts/bootstrap.js",
    emoji: "🚀",
  },
  {
    name: "Import Anime + Genres + Episodes",
    command: "node anime-website/scripts/index.js",
    emoji: "📺",
    delay: 3000, // Extra delay after bootstrap
  },
  {
    name: "Import Manga",
    command: "node anime-website/scripts/manga.js",
    emoji: "📖",
  },
  {
    name: "Upload Anime Poster Assets to CDN",
    command: "node anime-website/scripts/uploadAssets.js",
    emoji: "🖼️",
  },
  {
    name: "Upload Manga Cover Assets to CDN",
    command: "node anime-website/scripts/uploadMangaAssets.js",
    emoji: "🎨",
  },
  {
    name: "Create Daily Update",
    command: "node anime-website/scripts/dailyUpdate.js",
    emoji: "📰",
  },
  {
    name: "Publish All Entries",
    command: "node anime-website/scripts/publishEntries.js",
    emoji: "📤",
  },
  {
    name: "Setup Homepage + Audience Tags + Variants",
    command: "node anime-website/scripts/setupHomepage.js",
    emoji: "🏠",
  },
];

async function runSetup() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║        🏗️  AniVerse DXP - Full Setup              ║");
  console.log("║        Building everything from scratch            ║");
  console.log("╚════════════════════════════════════════════════════╝");
  console.log("");

  // Validate environment
  if (!process.env.CONTENTSTACK_API_KEY) {
    console.error("❌ Missing CONTENTSTACK_API_KEY in .env file");
    console.error("   Please configure your .env file first.");
    process.exit(1);
  }
  if (!process.env.CONTENTSTACK_MANAGEMENT_TOKEN) {
    console.error("❌ Missing CONTENTSTACK_MANAGEMENT_TOKEN in .env file");
    console.error("   Please configure your .env file first.");
    process.exit(1);
  }

  console.log(`🔑 API Key: ${process.env.CONTENTSTACK_API_KEY}`);
  console.log(`🌍 Environment: ${process.env.CONTENTSTACK_ENV || "development"}`);
  console.log("");

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNum = i + 1;

    console.log(`\n┌──────────────────────────────────────────────────┐`);
    console.log(`│ ${step.emoji}  Step ${stepNum}/${steps.length}: ${step.name.padEnd(37)}│`);
    console.log(`└──────────────────────────────────────────────────┘`);

    // Wait if needed
    if (step.delay) {
      console.log(`   ⏳ Waiting ${step.delay / 1000}s before starting...`);
      await new Promise((r) => setTimeout(r, step.delay));
    }

    try {
      execSync(step.command, {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
      });
      console.log(`\n   ✅ Step ${stepNum} completed successfully`);
      passed++;
    } catch (error) {
      console.error(`\n   ❌ Step ${stepNum} failed: ${error.message}`);
      failed++;

      // Continue with remaining steps even if one fails
      console.log("   ⚠️  Continuing with remaining steps...");
    }

    // Small delay between steps
    await new Promise((r) => setTimeout(r, 2000));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║               📊 Setup Complete                   ║");
  console.log("╠════════════════════════════════════════════════════╣");
  console.log(`║  ✅ Passed: ${String(passed).padEnd(4)} ❌ Failed: ${String(failed).padEnd(4)}               ║`);
  console.log(`║  ⏱  Total time: ${elapsed}s${" ".repeat(Math.max(0, 32 - elapsed.length))}║`);
  console.log("╠════════════════════════════════════════════════════╣");
  console.log("║                                                    ║");
  console.log("║  🌐 Frontend: cd anime-website && npm run dev      ║");
  console.log("║  📍 URL: http://localhost:3000                     ║");
  console.log("║                                                    ║");
  console.log("╠════════════════════════════════════════════════════╣");
  const envName = process.env.CONTENTSTACK_ENV || "development";
  console.log("║  📌 Manual Contentstack UI Setup:                  ║");
  console.log(`║  • Create a Delivery Token for '${envName}'${" ".repeat(Math.max(0, 15 - envName.length))}║`);
  console.log("║  • Set up Personalize (profile_type attribute)      ║");
  console.log("║  • Set up Brand Kit + Voice Profile (AniBot)       ║");
  console.log("║  • Create Automation for chatbot                   ║");
  console.log("║                                                    ║");
  console.log("║  🚀 Deploy to Contentstack Launch:                 ║");
  console.log("║  • Push code to GitHub repo                        ║");
  console.log("║  • Contentstack Launch → New Deployment             ║");
  console.log("║  • Connect repo, set env vars, deploy              ║");
  console.log("╚════════════════════════════════════════════════════╝");
}

runSetup().catch((err) => {
  console.error("💥 Setup failed:", err.message);
  process.exit(1);
});
