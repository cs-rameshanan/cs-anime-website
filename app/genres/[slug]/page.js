import { getGenreBySlug, getAllGenres, getAllAnime } from '@/lib/api';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AnimeCard from '@/components/AnimeCard';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const genres = await getAllGenres();
  return genres.map((genre) => ({
    slug: genre.slug,
  }));
}

export async function generateMetadata({ params }) {
  const genre = await getGenreBySlug(params.slug);
  if (!genre) return { title: 'Genre Not Found | AniVerse' };
  
  return {
    title: `${genre.title} Anime | AniVerse`,
    description: `Explore the best ${genre.title.toLowerCase()} anime on AniVerse`,
  };
}

export default async function GenreDetailPage({ params }) {
  const genre = await getGenreBySlug(params.slug);
  
  if (!genre) {
    notFound();
  }

  // Get all anime and filter by genre
  const allAnime = await getAllAnime();
  const animeInGenre = allAnime.filter((anime) => {
    const genres = anime.genres || [];
    return genres.some((g) => g.uid === genre.uid || g.slug === genre.slug);
  });

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/genres"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-aurora transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Genres
          </Link>
          
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            {genre.title} Anime
          </h1>
          <p className="text-xl text-gray-400">
            {animeInGenre.length} anime found in this genre
          </p>
        </div>

        {/* Anime Grid */}
        {animeInGenre.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {animeInGenre.map((anime, index) => (
              <AnimeCard key={anime.uid} anime={anime} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass rounded-2xl">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-white mb-2">No anime found</h3>
            <p className="text-gray-400 mb-6">
              We haven't added any {genre.title.toLowerCase()} anime yet.
            </p>
            <Link
              href="/anime"
              className="inline-flex px-6 py-3 rounded-full bg-aurora text-white font-medium hover:opacity-90 transition-opacity"
            >
              Browse All Anime
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

