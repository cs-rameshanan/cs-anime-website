import { csClient } from "./csClient.js";

// Check if episode already exists for a SPECIFIC anime
// Episode mal_id is only unique within an anime, not globally!
export async function episodeExists(episodeMalId, animeMalId) {
  const res = await csClient.get(
    `/content_types/episode/entries?query={"mal_id":${episodeMalId},"anime_mal_id":${animeMalId}}`
  );
  return res.data.entries.length > 0;
}

// Create episode in Contentstack
export async function createEpisode(episode, animeUid, animeMalId, animeTitle) {
  const episodeTitle = episode.title || `Episode ${episode.mal_id}`;
  
  const payload = {
    // Make title unique by including anime title
    title: `${animeTitle} - ${episodeTitle}`,
    // Include anime mal_id in slug to make it globally unique
    slug: `anime-${animeMalId}-episode-${episode.mal_id}`,
    episode_number: episode.mal_id,
    synopsis: episode.synopsis,
    air_date: episode.aired?.from || null,
    mal_id: episode.mal_id,
    anime_mal_id: animeMalId, // Store anime's mal_id for querying
    anime_reference: [{ uid: animeUid, _content_type_uid: "anime" }],
  };

  const res = await csClient.post("/content_types/episode/entries", {
    entry: payload,
  });

  return res.data.entry.uid;
}
