import { getFeaturedAnime, getAllGenres } from '@/lib/api';
import HeroSection from '@/components/HeroSection';
import AnimeCard from '@/components/AnimeCard';
import GenreBadge from '@/components/GenreBadge';
import Link from 'next/link';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  const [featuredAnime, genres] = await Promise.all([
    getFeaturedAnime(8),
    getAllGenres(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <HeroSection featuredAnime={featuredAnime} />

      {/* Featured Anime Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
                Top Rated Anime
              </h2>
              <p className="text-gray-400">Discover the highest-rated anime in our collection</p>
            </div>
            <Link
              href="/anime"
              className="hidden sm:inline-flex px-6 py-3 rounded-full glass text-white font-medium hover:bg-white/10 transition-colors"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredAnime.map((anime, index) => (
              <AnimeCard key={anime.uid} anime={anime} index={index} />
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/anime"
              className="inline-flex px-6 py-3 rounded-full glass text-white font-medium"
            >
              View All Anime →
            </Link>
          </div>
        </div>
      </section>

      {/* Genres Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 glass">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              Browse by Genre
            </h2>
            <p className="text-gray-400">Find anime that matches your mood</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {genres.map((genre) => (
              <GenreBadge key={genre.uid} genre={genre} size="large" />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Start Watching?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Explore our complete collection of anime and find your next favorite series.
          </p>
          <Link
            href="/anime"
            className="inline-flex px-8 py-4 rounded-full bg-gradient-to-r from-aurora to-stardust text-white font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Start Exploring
          </Link>
        </div>
      </section>
    </div>
  );
}

