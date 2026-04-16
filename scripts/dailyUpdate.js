import "dotenv/config";
import axios from "axios";
import { csClient } from "./csClient.js";

const JIKAN_WATCH_URL = "https://api.jikan.moe/v4/watch/episodes";

/**
 * Fetches recently updated episodes from JIKAN API
 * and creates a daily_update entry in Contentstack
 */
async function fetchAndCreateDailyUpdate() {
  console.log("🎬 Fetching recently updated episodes from JIKAN...");

  try {
    // Fetch recent episodes from JIKAN
    const { data } = await axios.get(JIKAN_WATCH_URL);
    const recentEpisodes = data.data || [];

    console.log(`📺 Found ${recentEpisodes.length} recently updated anime`);

    // Format the date
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const title = `Daily Update - ${dateStr}`;

    // Check if today's update already exists
    const existingRes = await csClient.get(
      `/content_types/daily_update/entries?query={"title":"${title}"}`
    );

    if (existingRes.data.entries.length > 0) {
      console.log("⏭ Today's update already exists, updating...");
      const existingUid = existingRes.data.entries[0].uid;

      // Update existing entry
      await csClient.put(`/content_types/daily_update/entries/${existingUid}`, {
        entry: {
          title,
          date: today.toISOString(),
          episodes: formatEpisodes(recentEpisodes),
        },
      });

      console.log("✅ Daily update entry updated!");
      return existingUid;
    }

    // Create new daily update entry
    const payload = {
      entry: {
        title,
        date: today.toISOString(),
        episodes: formatEpisodes(recentEpisodes),
      },
    };

    const res = await csClient.post("/content_types/daily_update/entries", payload);
    const entryUid = res.data.entry.uid;

    console.log("✅ Daily update entry created:", entryUid);

    // Auto-publish the entry
    await publishEntry(entryUid);

    return entryUid;
  } catch (error) {
    console.error("❌ Error creating daily update:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Format episodes data for storage (as JSON string for Multi Line Text field)
 */
function formatEpisodes(episodes) {
  const items = episodes.slice(0, 5).map((item) => ({
    anime_title: item.entry?.title || "Unknown",
    anime_mal_id: item.entry?.mal_id,
    anime_image: item.entry?.images?.jpg?.image_url,
    episode_title: item.episodes?.[0]?.title || "New Episode",
    episode_number: item.episodes?.[0]?.mal_id,
    episode_url: item.episodes?.[0]?.url,
    is_premium: item.episodes?.[0]?.premium || false,
  }));
  
  // Store as JSON string
  return JSON.stringify(items);
}

/**
 * Publish entry to configured environment
 */
async function publishEntry(entryUid) {
  const envName = process.env.CONTENTSTACK_ENV || "development";
  try {
    await csClient.post(`/content_types/daily_update/entries/${entryUid}/publish`, {
      entry: {
        environments: [envName],
        locales: ["en-us"],
      },
    });
    console.log(`📤 Entry published to ${envName}!`);
  } catch (error) {
    console.error("⚠️ Could not auto-publish:", error.response?.data?.error_message || error.message);
  }
}

// Run if called directly
fetchAndCreateDailyUpdate()
  .then(() => console.log("🎉 Daily update completed!"))
  .catch((err) => {
    console.error("💥 Failed:", err.message);
    process.exit(1);
  });

export { fetchAndCreateDailyUpdate };

