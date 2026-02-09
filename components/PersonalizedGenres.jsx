'use client';

import { useMemo } from 'react';
import { useProfile } from '@/context/ProfileContext';
import { filterGenresByProfile } from '@/lib/profileConfig';
import GenreBadge from '@/components/GenreBadge';

export default function PersonalizedGenres({ genres }) {
  const { profileType, isKidsProfile, isLoading } = useProfile();

  // Filter genres based on current profile
  const filteredGenres = useMemo(() => {
    if (!profileType) return genres;
    return filterGenresByProfile(genres, profileType);
  }, [genres, profileType]);

  const sectionTitle = isKidsProfile ? 'Fun Genres to Explore' : 'Browse by Genre';
  const sectionSubtitle = isKidsProfile 
    ? 'Pick a category and start your adventure!'
    : 'Find anime that matches your mood';

  if (isLoading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 glass">
        <div className="max-w-7xl mx-auto text-center">
          <div className="h-10 w-64 bg-gray-700 rounded-lg animate-pulse mx-auto mb-4"></div>
          <div className="h-6 w-96 bg-gray-700 rounded-lg animate-pulse mx-auto mb-10"></div>
          <div className="flex flex-wrap justify-center gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-gray-700 rounded-full animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 glass">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
            {sectionTitle}
          </h2>
          <p className="text-gray-400">{sectionSubtitle}</p>
          
          {/* Kids mode notice */}
          {isKidsProfile && filteredGenres.length < (genres?.length || 0) && (
            <p className="text-pink-400 text-sm mt-2">
              Showing {filteredGenres.length} kid-friendly genres
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {filteredGenres.map((genre) => (
            <GenreBadge key={genre.uid} genre={genre} size="large" />
          ))}
        </div>
      </div>
    </section>
  );
}
