import Stack from './contentstack';

// Helper to create slug from title
function createSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper to normalize slug (remove leading/trailing slashes + special chars like colons)
function normalizeSlug(slug) {
  if (!slug) return '';
  return slug
    .replace(/^\/+|\/+$/g, '')  // strip leading/trailing slashes
    .replace(/[^a-z0-9-]/g, '-') // replace special chars (colons, etc.) with dash
    .replace(/-{2,}/g, '-')      // collapse multiple dashes
    .replace(/(^-|-$)/g, '');    // strip leading/trailing dashes
}

// ==================== ANIME ====================

export async function getAllAnime() {
  try {
    const query = Stack.ContentType('anime').Query();
    const result = await query
      .includeReference(['genres'])
      .toJSON()
      .find();
    
    const animeList = result[0] || [];
    
    return animeList.map(anime => ({
      ...anime,
      slug: normalizeSlug(anime.slug) || normalizeSlug(anime.url) || createSlug(anime.title),
    }));
  } catch (error) {
    console.error('Error fetching anime:', error);
    return [];
  }
}

export async function getAnimeBySlug(slug) {
  try {
    // Normalize the input slug (strips colons and special chars)
    const normalizedInputSlug = normalizeSlug(slug);
    
    // Get all anime (with resolved genres) and match by normalized slug
    // This is more reliable than querying by slug field because stored slugs
    // may contain special chars (e.g. "clannad:-after-story") while URL slugs don't
    const allAnime = await getAllAnime();
    const matched = allAnime.find(anime => anime.slug === normalizedInputSlug);
    
    return matched || null;
  } catch (error) {
    console.error('Error fetching anime by slug:', error);
    return null;
  }
}

export async function getFeaturedAnime(limit = 5) {
  try {
    const query = Stack.ContentType('anime').Query();
    const result = await query
      .descending('rating')
      .limit(limit)
      .includeReference(['genres'])
      .toJSON()
      .find();
    // Add generated slug to each anime for consistent linking
    const animeList = result[0] || [];
    return animeList.map(anime => ({
      ...anime,
      slug: normalizeSlug(anime.slug) || normalizeSlug(anime.url) || createSlug(anime.title),
    }));
  } catch (error) {
    console.error('Error fetching featured anime:', error);
    return [];
  }
}

// ==================== GENRES ====================

export async function getAllGenres() {
  try {
    const query = Stack.ContentType('genre').Query();
    const result = await query.toJSON().find();
    const genres = result[0] || [];
    return genres.map(genre => ({
      ...genre,
      slug: normalizeSlug(genre.slug) || normalizeSlug(genre.url) || createSlug(genre.title),
    }));
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
}

export async function getGenreBySlug(slug) {
  try {
    const normalizedInputSlug = normalizeSlug(slug);
    const allGenres = await getAllGenres();
    return allGenres.find(genre => genre.slug === normalizedInputSlug) || null;
  } catch (error) {
    console.error('Error fetching genre by slug:', error);
    return null;
  }
}

export async function getAnimeByGenre(genreUid) {
  try {
    const query = Stack.ContentType('anime').Query();
    const result = await query
      .where('genres', { '$in_query': { 'uid': genreUid } })
      .includeReference(['genres'])
      .toJSON()
      .find();
    return result[0] || [];
  } catch (error) {
    console.error('Error fetching anime by genre:', error);
    return [];
  }
}

// ==================== EPISODES ====================

export async function getEpisodesByAnime(animeUid) {
  try {
    // Query episodes that reference this specific anime
    // Use referenceIn to filter server-side instead of fetching all episodes
    const query = Stack.ContentType('episode').Query();
    const result = await query
      .where('anime_reference', { '$in_query': { 'uid': animeUid } })
      .limit(50)
      .toJSON()
      .find();
    
    let episodes = result[0] || [];

    // If server-side reference filter didn't work, fall back to client-side filter
    // (some SDK versions don't support $in_query on reference fields)
    if (episodes.length === 0) {
      const fallbackQuery = Stack.ContentType('episode').Query();
      const fallbackResult = await fallbackQuery
        .limit(200)
        .includeReference(['anime_reference'])
        .toJSON()
        .find();
      
      const allEpisodes = fallbackResult[0] || [];
      episodes = allEpisodes.filter(episode => {
        const refs = episode.anime_reference || [];
        return refs.some(ref => {
          // Handle both resolved and unresolved references
          const refUid = ref.uid || ref;
          return refUid === animeUid;
        });
      });
    }
    
    // Sort by episode number
    return episodes.sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return [];
  }
}

export async function getEpisodeBySlug(slug) {
  try {
    const query = Stack.ContentType('episode').Query();
    const result = await query
      .equalTo('slug', slug)
      .includeReference(['anime_reference'])
      .toJSON()
      .find();
    return result[0]?.[0] || null;
  } catch (error) {
    console.error('Error fetching episode by slug:', error);
    return null;
  }
}

// ==================== MANGA ====================

export async function getAllManga() {
  try {
    const query = Stack.ContentType('manga').Query();
    const result = await query
      .toJSON()
      .find();
    
    const mangaList = result[0] || [];
    
    return mangaList.map(manga => ({
      ...manga,
      slug: normalizeSlug(manga.slug) || createSlug(manga.title),
    }));
  } catch (error) {
    console.error('Error fetching manga:', error);
    return [];
  }
}

export async function getMangaBySlug(slug) {
  try {
    const normalizedInputSlug = normalizeSlug(slug);
    
    const query = Stack.ContentType('manga').Query();
    const result = await query
      .toJSON()
      .find();
    
    const allManga = result[0] || [];
    const matched = allManga.find(manga => {
      const mangaSlug = normalizeSlug(manga.slug) || createSlug(manga.title);
      return mangaSlug === normalizedInputSlug;
    });
    
    if (matched) {
      return {
        ...matched,
        slug: normalizeSlug(matched.slug) || createSlug(matched.title),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching manga by slug:', error);
    return null;
  }
}

export async function getFeaturedManga(limit = 8) {
  try {
    const query = Stack.ContentType('manga').Query();
    const result = await query
      .limit(limit)
      .toJSON()
      .find();
    
    const mangaList = result[0] || [];
    return mangaList.map(manga => ({
      ...manga,
      slug: normalizeSlug(manga.slug) || createSlug(manga.title),
    }));
  } catch (error) {
    console.error('Error fetching featured manga:', error);
    return [];
  }
}

// ==================== DAILY UPDATES ====================

export async function getLatestDailyUpdate() {
  try {
    const query = Stack.ContentType('daily_update').Query();
    const result = await query
      .descending('date')
      .limit(1)
      .toJSON()
      .find();
    
    const update = result[0]?.[0] || null;
    
    if (update && update.episodes) {
      // Parse the JSON string back to array
      try {
        update.episodesList = JSON.parse(update.episodes);
      } catch {
        update.episodesList = [];
      }
    }
    
    return update;
  } catch (error) {
    console.error('Error fetching daily update:', error);
    return null;
  }
}

// ==================== HOMEPAGE ====================

export async function getHomepage() {
  try {
    const query = Stack.ContentType('homepage').Query();
    const result = await query
      .includeReference(['featured_anime'])
      .toJSON()
      .find();
    
    const homepage = result[0]?.[0] || null;
    return homepage;
  } catch (error) {
    console.error('Error fetching homepage:', error);
    return null;
  }
}

