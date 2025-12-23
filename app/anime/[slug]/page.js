import { getAnimeBySlug, getEpisodesByAnime, getAllAnime } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GenreBadge from '@/components/GenreBadge';
import EpisodeCard from '@/components/EpisodeCard';

export const revalidate = 60;

export async function generateStaticParams() {
  const animeList = await getAllAnime();
  return animeList.map((anime) => ({
    slug: anime.slug,
  }));
}

export async function generateMetadata({ params }) {
  const anime = await getAnimeBySlug(params.slug);
  if (!anime) return { title: 'Anime Not Found | AniVerse' };
  
  return {
    title: `${anime.title} | AniVerse`,
    description: anime.description?.substring(0, 160) || `Watch ${anime.title} on AniVerse`,
  };
}

export default async function AnimeDetailPage({ params }) {
  const anime = await getAnimeBySlug(params.slug);
  
  if (!anime) {
    notFound();
  }

  const episodes = await getEpisodesByAnime(anime.uid);
  const genres = anime.genres || [];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-end">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src={anime.poster_url || '/placeholder.jpg'}
            alt=""
            fill
            className="object-cover opacity-30 blur-sm"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="relative w-64 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl animate-glow">
                <Image
                  src={anime.poster_url || '/placeholder.jpg'}
                  alt={anime.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
                {anime.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {anime.rating && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
                    <span className="star-rating text-xl">★</span>
                    <span className="text-white font-bold text-lg">{anime.rating.toFixed(1)}</span>
                  </div>
                )}
                {anime.release_year && (
                  <div className="px-4 py-2 rounded-full glass text-gray-300">
                    {anime.release_year}
                  </div>
                )}
                {anime.status && (
                  <div className="px-4 py-2 rounded-full bg-aurora/80 text-white">
                    {anime.status}
                  </div>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {genres.map((genre) => (
                  <GenreBadge key={genre.uid} genre={genre} />
                ))}
              </div>

              {/* Description */}
              {anime.description && (
                <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
                  {anime.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Episodes Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-8">
            Episodes ({episodes.length})
          </h2>

          {episodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {episodes.map((episode, index) => (
                <EpisodeCard key={episode.uid} episode={episode} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 glass rounded-2xl">
              <div className="text-4xl mb-4">📺</div>
              <p className="text-gray-400">No episodes available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Link
          href="/anime"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-aurora transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Anime
        </Link>
      </div>
    </div>
  );
}

