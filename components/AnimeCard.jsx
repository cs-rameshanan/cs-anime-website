import Image from 'next/image';
import Link from 'next/link';

// Helper to create slug from title
function createSlug(title) {
  if (!title) return null;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AnimeCard({ anime, index = 0 }) {
  if (!anime) return null;
  
  const genres = anime.genres || [];
  // Use slug if available, otherwise create from title, or fallback to uid
  const slug = anime.slug || anime.url || createSlug(anime.title) || anime.uid;
  
  // Safety check - don't render if we can't create a valid link
  if (!slug) {
    console.warn('AnimeCard: Missing slug for anime', anime);
    return null;
  }
  
  const href = `/anime/${slug}`;
  
  return (
    <Link 
      href={href}
      className={`anime-card block rounded-2xl overflow-hidden glass opacity-0 animate-slide-up`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={anime.poster_url || '/placeholder.jpg'}
          alt={anime.title}
          fill
          className="object-cover card-image transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-transparent to-transparent" />
        
        {/* Hover Overlay */}
        <div className="card-overlay absolute inset-0 bg-aurora/20 opacity-0 transition-opacity duration-300 flex items-center justify-center">
          <span className="px-6 py-3 bg-aurora rounded-full text-white font-medium">
            View Details
          </span>
        </div>

        {/* Rating Badge */}
        {anime.rating && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-midnight/80 backdrop-blur-sm flex items-center space-x-1">
            <span className="star-rating">★</span>
            <span className="text-white font-medium">{anime.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Status Badge */}
        {anime.status && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-aurora/80 backdrop-blur-sm">
            <span className="text-white text-sm font-medium">{anime.status}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-semibold text-lg text-white mb-2 line-clamp-2">
          {anime.title}
        </h3>
        
        {/* Genres */}
        <div className="flex flex-wrap gap-2 mb-3">
          {genres.slice(0, 3).map((genre, i) => (
            <span 
              key={genre.uid || i} 
              className="genre-badge px-2 py-1 rounded-full text-xs text-gray-300"
            >
              {genre.title}
            </span>
          ))}
        </div>

        {/* Year */}
        {anime.release_year && (
          <p className="text-gray-500 text-sm">{anime.release_year}</p>
        )}
      </div>
    </Link>
  );
}

