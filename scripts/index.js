import "dotenv/config";
import axios from "axios";
import { getOrCreateGenre } from "./genres.js";
import { animeExists, createAnime, getAnimeUid } from "./anime.js";
import { episodeExists, createEpisode } from "./episodes.js";

const JIKAN_URL = "https://api.jikan.moe/v4/top/anime?limit=25";
const DRY_RUN = process.env.DRY_RUN === "true";

(async () => {
  console.log("🎌 Fetching anime from JIKAN");
  console.log("🧪 DRY RUN:", DRY_RUN);

  const { data } = await axios.get(JIKAN_URL);

  for (const anime of data.data) {
    console.log("\n--------------------------");
    console.log("Title:", anime.title);
    console.log("MAL ID:", anime.mal_id);
    console.log("Genres:", anime.genres.map(g => g.name).join(", "));
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
        for (const genre of anime.genres) {
          const uid = await getOrCreateGenre(genre.name);
          genreRefs.push({ uid, _content_type_uid: "genre" });
        }
        animeUid = await createAnime(anime, genreRefs);
        console.log("✅ Anime Imported");
      }
    }

    // ----- Step 4: Import latest 5 episodes -----
    console.log(`🎬 Fetching latest 5 episodes for ${anime.title}`);

    const epsRes = await axios.get(
      `https://api.jikan.moe/v4/anime/${anime.mal_id}/episodes`
    );
    
    const allEpisodes = epsRes.data.data || [];
    // Get the latest 5 episodes (last 5 from the list)
    const episodes = allEpisodes.slice(-5);

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
})();
