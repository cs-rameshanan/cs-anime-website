import "dotenv/config";
import axios from "axios";
import { getOrCreateGenre } from "./genres.js";
import { animeExists, createAnime, getAnimeUid } from "./anime.js";
import { episodeExists, createEpisode } from "./episodes.js";

const JIKAN_URL = "https://api.jikan.moe/v4/top/anime?limit=25";
const DRY_RUN = process.env.DRY_RUN === "true";

/** Jikan asks ~3s between requests on the public API; reduces upstream/rate-limit failures. */
const JIKAN_DELAY_MS = Math.max(0, Number(process.env.JIKAN_DELAY_MS ?? "3200") || 0);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Jikan often returns 5xx when MyAnimeList is slow; retry with backoff, then let caller skip if needed.
 */
async function getJikanJson(url, { retries = 5, label = url } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await axios.get(url, {
      validateStatus: () => true,
      timeout: 45000,
    });
    if (res.status >= 200 && res.status < 300) return res.data;
    const body = typeof res.data === "object" ? JSON.stringify(res.data).slice(0, 500) : String(res.data);
    lastErr = new Error(`Jikan ${res.status} ${body}`);
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === retries) throw lastErr;
    const wait = Math.min(20000, 2000 * 2 ** (attempt - 1));
    console.warn(`  ${label}: HTTP ${res.status} (attempt ${attempt}/${retries}), waiting ${wait}ms…`);
    await sleep(wait);
  }
  throw lastErr;
}

async function throttleJikan() {
  if (JIKAN_DELAY_MS > 0) await sleep(JIKAN_DELAY_MS);
}

(async () => {
  console.log("🎌 Fetching anime from JIKAN");
  console.log("🧪 DRY RUN:", DRY_RUN);
  if (JIKAN_DELAY_MS) console.log("⏱ JIKAN_DELAY_MS:", JIKAN_DELAY_MS);

  const data = await getJikanJson(JIKAN_URL, { label: "top/anime" });
  if (!Array.isArray(data?.data)) {
    console.error("Unexpected Jikan top response (no data array):", data);
    process.exit(1);
  }

  for (const anime of data.data) {
    console.log("\n--------------------------");
    console.log("Title:", anime.title);
    console.log("MAL ID:", anime.mal_id);
    console.log("Genres:", (anime.genres || []).map((g) => g.name).join(", "));
    console.log("Poster:", anime.images.jpg.image_url);

    let animeUid = null;

    if (DRY_RUN) {
      console.log("➡️ Dry run: no Contentstack write");
      animeUid = "DRY_RUN_ANIME_UID"; // placeholder for episodes
    } else {
      if (await animeExists(anime.mal_id)) {
        console.log("⏭ Already exists, skipping");
        animeUid = await getAnimeUid(anime.mal_id);
      } else {
        const genreRefs = [];
        for (const genre of anime.genres || []) {
          const uid = await getOrCreateGenre(genre.name);
          genreRefs.push({ uid, _content_type_uid: "genre" });
        }
        animeUid = await createAnime(anime, genreRefs);
        console.log("✅ Anime Imported");
      }
    }

    // ----- Step 4: Import latest 5 episodes -----
    console.log(`🎬 Fetching latest 5 episodes for ${anime.title}`);

    let episodes = [];
    try {
      await throttleJikan();
      const epsData = await getJikanJson(
        `https://api.jikan.moe/v4/anime/${anime.mal_id}/episodes`,
        { label: `anime/${anime.mal_id}/episodes` }
      );
      const allEpisodes = epsData.data || [];
      episodes = allEpisodes.slice(-5);
    } catch (e) {
      console.warn(
        `⚠️ Skipping episodes for "${anime.title}" (MAL ${anime.mal_id}):`,
        e?.message || e,
        "\n  (Jikan/MAL upstream is often flaky; re-run later or set JIKAN_DELAY_MS=4000.)"
      );
    }

    for (const episode of episodes) {
      console.log(`Episode: ${episode.title || "N/A"} | MAL ID: ${episode.mal_id}`);
      if (DRY_RUN) {
        console.log("➡️ Dry run: no episode created");
        continue;
      }

      // Check if episode exists for THIS specific anime (not just any anime)
      if (await episodeExists(episode.mal_id, anime.mal_id)) {
        console.log("⏭ Already exists for this anime, skipping episode");
        continue;
      }

      await createEpisode(episode, animeUid, anime.mal_id, anime.title);
      console.log("✅ Episode Imported");
    }

    console.log(`🎬 Episodes imported for ${anime.title}`);
  }

  console.log("\n🎉 Import process completed");
})().catch((e) => {
  console.error("\n❌ Import failed:", e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
