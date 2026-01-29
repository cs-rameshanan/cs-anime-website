import { getAllAnime, getAllGenres } from '@/lib/api';
import FilteredAnimeList from '@/components/FilteredAnimeList';

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

        {/* Filtered Anime List - filters based on profile */}
        <FilteredAnimeList animeList={animeList} genres={genres} />
      </div>
    </div>
  );
}

