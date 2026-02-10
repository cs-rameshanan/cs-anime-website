/**
 * Profile Configuration for Personalization
 * 
 * Define which genres are blocked for each profile type.
 * This allows dynamic content filtering based on user profile.
 */

export const PROFILE_TYPES = {
  KIDS: 'kids',
  NORMAL: 'normal',
};

// Genres that should be hidden for Kids profile
// Add or remove genres as needed
export const KIDS_BLOCKED_GENRES = [
  'action',
  'horror',
  'psychological',
  'thriller',
  'suspense',  // JIKAN uses "Suspense" instead of "Thriller"
  'ecchi',
  'violence',
  'mature',
  'seinen',    // Aimed at adult men
  'josei',     // Aimed at adult women
  'award winning', // Often heavy/mature themes
];

// Profile configurations
export const PROFILE_CONFIG = {
  [PROFILE_TYPES.KIDS]: {
    name: 'Kids',
    description: 'Safe content for children',
    blockedGenres: KIDS_BLOCKED_GENRES,
    // Optional: You can also filter by rating
    allowedRatings: ['G', 'PG', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG'],
    theme: {
      primaryColor: 'pink',
      backgroundColor: 'from-pink-900 to-purple-900',
    },
  },
  [PROFILE_TYPES.NORMAL]: {
    name: 'Normal',
    description: 'Full content access',
    blockedGenres: [], // No restrictions
    allowedRatings: null, // All ratings allowed
    theme: {
      primaryColor: 'purple',
      backgroundColor: 'from-gray-900 to-black',
    },
  },
};

/**
 * Check if an anime should be shown for a given profile
 * @param {Object} anime - The anime object with genres
 * @param {string} profileType - The profile type ('kids' or 'normal')
 * @returns {boolean} - Whether the anime should be shown
 */
export function shouldShowAnime(anime, profileType) {
  const config = PROFILE_CONFIG[profileType];
  
  // If no config or normal profile, show everything
  if (!config || profileType === PROFILE_TYPES.NORMAL) {
    return true;
  }

  // Check audience_tag first (set by setupHomepage.js)
  if (anime.audience_tag) {
    if (profileType === PROFILE_TYPES.KIDS) {
      // Kids: show 'all' and 'kids', hide 'normal'
      return anime.audience_tag === 'all' || anime.audience_tag === 'kids';
    }
    // Normal: show 'all' and 'normal', hide 'kids'
    return anime.audience_tag === 'all' || anime.audience_tag === 'normal';
  }

  // Fallback: filter by genre if no audience_tag
  const animeGenres = anime.genres || [];
  const blockedGenres = config.blockedGenres || [];

  // Warn once if genres appear unresolved (no title = reference not resolved by SDK)
  if (animeGenres.length > 0 && !animeGenres[0].title && typeof animeGenres[0] !== 'string') {
    console.warn(
      `[profileConfig] Genre references not resolved for "${anime.title}". ` +
      `Genre data: ${JSON.stringify(animeGenres[0])}. ` +
      `Run "npm run publish" to publish genre entries, or set audience_tag on anime.`
    );
    // Can't filter by genre if references are unresolved - show the anime
    return true;
  }

  for (const genre of animeGenres) {
    // Genre can be a reference object, a string, or an unresolved reference
    const genreTitle = genre.title || genre.name || (typeof genre === 'string' ? genre : '');
    const genreName = genreTitle.toLowerCase();
    const genreSlug = (genre.slug || '').toLowerCase().replace(/^\//, '');
    
    if (blockedGenres.some(blocked => 
      genreName.includes(blocked) || genreSlug.includes(blocked)
    )) {
      return false; // Block this anime
    }
  }

  // Optionally check rating (if your anime has a 'rating' or 'content_rating' field)
  if (config.allowedRatings && anime.content_rating) {
    if (!config.allowedRatings.includes(anime.content_rating)) {
      return false;
    }
  }

  return true;
}

/**
 * Filter an array of anime based on profile
 * @param {Array} animeList - Array of anime objects
 * @param {string} profileType - The profile type ('kids' or 'normal')
 * @returns {Array} - Filtered anime list
 */
export function filterAnimeByProfile(animeList, profileType) {
  if (!Array.isArray(animeList)) return [];
  if (!profileType || profileType === PROFILE_TYPES.NORMAL) {
    return animeList;
  }

  return animeList.filter(anime => shouldShowAnime(anime, profileType));
}

/**
 * Filter genres to only show allowed ones for a profile
 * @param {Array} genres - Array of genre objects
 * @param {string} profileType - The profile type
 * @returns {Array} - Filtered genres list
 */
export function filterGenresByProfile(genres, profileType) {
  if (!Array.isArray(genres)) return [];
  const config = PROFILE_CONFIG[profileType];
  
  if (!config || profileType === PROFILE_TYPES.NORMAL) {
    return genres;
  }

  const blockedGenres = config.blockedGenres || [];

  return genres.filter(genre => {
    const genreName = (genre.title || genre.name || '').toLowerCase();
    const genreSlug = (genre.slug || '').toLowerCase().replace(/^\//, '');
    
    return !blockedGenres.some(blocked => 
      genreName.includes(blocked) || genreSlug.includes(blocked)
    );
  });
}
