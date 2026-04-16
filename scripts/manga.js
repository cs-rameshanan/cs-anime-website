import "dotenv/config";
import { csClient } from "./csClient.js";
import axios from "axios";

// Fetch manga from JIKAN API
async function fetchMangaFromJikan(limit = 25) {
  console.log(`📚 Fetching top ${limit} manga from JIKAN...`);
  const response = await axios.get(
    `https://api.jikan.moe/v4/top/manga?limit=${limit}`
  );
  return response.data.data;
}

// Check if manga already exists
async function mangaExists(malId) {
  const res = await csClient.get(
    `/content_types/manga/entries?query={"mal_id":${malId}}`
  );
  return res.data.entries.length > 0;
}

// Create manga entry
async function createManga(manga) {
  // Generate a random price between $9.99 and $39.99
  const price = parseFloat((Math.random() * 30 + 9.99).toFixed(2));
  
  const payload = {
    entry: {
      title: manga.title,
      slug: manga.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      synopsis: manga.synopsis || "No synopsis available.",
      cover_image: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
      price: price,
      author: manga.authors?.[0]?.name || "Unknown",
      volumes: manga.volumes || 1,
      status: manga.status || "Publishing",
      mal_id: manga.mal_id,
    },
  };

  const res = await csClient.post("/content_types/manga/entries", payload);
  return res.data.entry.uid;
}

// Main import function
async function importManga() {
  try {
    const mangaList = await fetchMangaFromJikan(25);
    console.log(`✅ Found ${mangaList.length} manga\n`);

    for (const manga of mangaList) {
      console.log(`📖 Processing: ${manga.title}`);

      if (await mangaExists(manga.mal_id)) {
        console.log(`  ↳ Already exists, skipping\n`);
        continue;
      }

      try {
        const uid = await createManga(manga);
        console.log(`  ↳ Created with UID: ${uid}\n`);
        
        // Rate limit to avoid API throttling
        await new Promise((r) => setTimeout(r, 500));
      } catch (error) {
        console.error(`  ↳ Error creating manga:`, error.response?.data || error.message);
      }
    }

    console.log("\n🎉 Manga import complete!");
  } catch (error) {
    console.error("Error importing manga:", error.message);
  }
}

importManga();