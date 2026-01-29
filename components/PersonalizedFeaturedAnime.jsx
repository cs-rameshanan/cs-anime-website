'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useProfile } from '@/context/ProfileContext';
import { filterAnimeByProfile } from '@/lib/profileConfig';
import AnimeCard from '@/components/AnimeCard';

export default function PersonalizedFeaturedAnime({ animeList }) {
  const { profileType, isKidsProfile, isLoading } = useProfile();

  // Filter anime based on current profile
  const filteredAnime = useMemo(() => {
    if (!profileType) return animeList;
    return filterAnimeByProfile(animeList, profileType);
  }, [animeList, profileType]);

  // Section title based on profile
  const sectionTitle = isKidsProfile ? 'Top Picks for Kids' : 'Top Rated Anime';
  const sectionSubtitle = isKidsProfile 
    ? 'Fun and exciting anime perfect for young viewers'
    : 'Discover the highest-rated anime in our collection';

  if (isLoading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-10 w-64 bg-gray-700 rounded-lg animate-pulse mb-4"></div>
          <div className="h-6 w-96 bg-gray-700 rounded-lg animate-pulse mb-10"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              {sectionTitle}
            </h2>
            <p className="text-gray-400">{sectionSubtitle}</p>
          </div>
          <Link
            href="/anime"
            className="hidden sm:inline-flex px-6 py-3 rounded-full glass text-white font-medium hover:bg-white/10 transition-colors"
          >
            View All →
          </Link>
        </div>

        {filteredAnime.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredAnime.slice(0, 8).map((anime, index) => (
              <AnimeCard key={anime.uid} anime={anime} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass rounded-2xl">
            <div className="text-4xl mb-4">🎬</div>
            <p className="text-gray-400">
              {isKidsProfile 
                ? "No kid-friendly anime found in featured section"
                : "No featured anime available"
              }
            </p>
          </div>
        )}

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
  );
}
