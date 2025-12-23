import Stack from './contentstack';

// Helper to create slug from title
function createSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper to normalize slug (remove leading/trailing slashes)
function normalizeSlug(slug) {
  if (!slug) return '';
  return slug.replace(/^\/+|\/+$/g, '');
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
    // Normalize the input slug
    const normalizedInputSlug = normalizeSlug(slug);
    
    // First try to find by slug field (try both with and without leading slash)
    const query = Stack.ContentType('anime').Query();
    const result = await query
      .equalTo('slug', `/${normalizedInputSlug}`)
      .includeReference(['genres'])
      .toJSON()
      .find();
    
    if (result[0]?.length > 0) {
      const anime = result[0][0];
      return {
        ...anime,
        slug: normalizeSlug(anime.slug) || normalizeSlug(anime.url) || createSlug(anime.title),
      };
    }
    
    // If not found, get all anime and match by generated slug from title
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
    // Normalize the input slug
    const normalizedInputSlug = normalizeSlug(slug);
    
    // First try to find by slug field (try with leading slash)
    const query = Stack.ContentType('genre').Query();
    const result = await query
      .equalTo('slug', `/${normalizedInputSlug}`)
      .toJSON()
      .find();
    
    if (result[0]?.length > 0) {
      const genre = result[0][0];
      return {
        ...genre,
        slug: normalizeSlug(genre.slug) || normalizeSlug(genre.url) || createSlug(genre.title),
      };
    }
    
    // If not found, get all genres and match by normalized slug
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
    // Get all episodes and filter by anime reference
    const query = Stack.ContentType('episode').Query();
    const result = await query
      .includeReference(['anime_reference'])
      .toJSON()
      .find();
    
    const allEpisodes = result[0] || [];
    
    // Filter episodes that reference this anime
    const filteredEpisodes = allEpisodes.filter(episode => {
      const refs = episode.anime_reference || [];
      return refs.some(ref => ref.uid === animeUid);
    });
    
    // Sort by episode number
    return filteredEpisodes.sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
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

