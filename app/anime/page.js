import { getAllAnime, getAllGenres } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import GenreBadge from '@/components/GenreBadge';

export const revalidate = 60;

export const metadata = {
  title: 'Browse Anime | AniVerse',
  description: 'Explore our complete collection of anime',
};

export default async function AnimePage() {
  const [animeList, genres] = await Promise.all([
    getAllAnime(),
    getAllGenres(),
  ]);

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Anime Collection
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Explore our curated collection of the best anime from all genres
          </p>
        </div>

        {/* Genre Filters */}
        <div className="mb-12">
          <h3 className="text-lg font-medium text-white mb-4">Filter by Genre</h3>
          <div className="flex flex-wrap gap-3">
            {genres.map((genre) => (
              <GenreBadge key={genre.uid} genre={genre} />
            ))}
          </div>
        </div>

        {/* Anime Grid */}
        {animeList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {animeList.map((anime, index) => (
              <AnimeCard key={anime.uid} anime={anime} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-medium text-white mb-2">No anime found</h3>
            <p className="text-gray-400">Check back later for new additions!</p>
          </div>
        )}
      </div>
    </div>
  );
}

