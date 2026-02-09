import { getAllGenres } from '@/lib/api';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Browse Genres | AniVerse',
  description: 'Explore anime by genre',
};

const genreIcons = {
  'action': '⚔️',
  'adventure': '🗺️',
  'comedy': '😂',
  'drama': '🎭',
  'fantasy': '🧙',
  'horror': '👻',
  'mystery': '🔍',
  'romance': '💕',
  'sci-fi': '🚀',
  'slice-of-life': '🌸',
  'sports': '⚽',
  'supernatural': '✨',
  'thriller': '😱',
  'suspense': '😰',
};

export default async function GenresPage() {
  const genres = await getAllGenres();

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Explore Genres
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover anime that matches your mood and preferences
          </p>
        </div>

        {/* Genres Grid */}
        {genres.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {genres.map((genre, index) => {
              const icon = genreIcons[genre.slug] || '🎬';
              return (
                <Link
                  key={genre.uid}
                  href={`/genres/${genre.slug}`}
                  className={`glass rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group opacity-0 animate-slide-up`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {icon}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white mb-2 group-hover:text-aurora transition-colors">
                    {genre.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Explore {genre.title.toLowerCase()} anime →
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-xl font-medium text-white mb-2">No genres found</h3>
            <p className="text-gray-400">Check back later for new additions!</p>
          </div>
        )}
      </div>
    </div>
  );
}

