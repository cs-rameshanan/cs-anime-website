import slugify from "slugify";
import { csClient } from "../../csClient.js";

export async function animeExists(malId) {
  const res = await csClient.get(
    `/content_types/anime/entries?query={"mal_id":${malId}}`
  );
  return res.data.entries.length > 0;
}

export async function getAnimeUid(malId) {
  const res = await csClient.get(
    `/content_types/anime/entries?query={"mal_id":${malId}}`
  );
  if (res.data.entries.length > 0) {
    return res.data.entries[0].uid;
  }
  return null;
}

export async function createAnime(anime, genreRefs) {
  const payload = {
    title: anime.title,
    slug: slugify(anime.title, { lower: true }),
    description: anime.synopsis,
    rating: anime.score,
    release_year: anime.year,
    status: anime.status,
    poster_url: anime.images.jpg.image_url,
    mal_id: anime.mal_id,
    genres: genreRefs,
  };

  const res = await csClient.post(
    "/content_types/anime/entries",
    { entry: payload }
  );

  return res.data.entry.uid;
}
