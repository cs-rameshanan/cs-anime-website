'use client';

import { useMemo } from 'react';
import { useProfile } from '@/context/ProfileContext';
import { filterAnimeByProfile, filterGenresByProfile } from '@/lib/profileConfig';
import AnimeCard from '@/components/AnimeCard';
import GenreBadge from '@/components/GenreBadge';

export default function FilteredAnimeList({ animeList, genres }) {
  const { profileType, isKidsProfile, isLoading } = useProfile();

  // Filter anime based on current profile
  const filteredAnime = useMemo(() => {
    if (!profileType) return animeList;
    return filterAnimeByProfile(animeList, profileType);
  }, [animeList, profileType]);

  // Filter genres to hide blocked ones from Kids
  const filteredGenres = useMemo(() => {
    if (!profileType) return genres;
    return filterGenresByProfile(genres, profileType);
  }, [genres, profileType]);

  // Calculate how many anime were filtered out
  const hiddenCount = animeList.length - filteredAnime.length;

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Kids Mode Banner */}
      {isKidsProfile && (
        <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👶</span>
            <div>
              <h3 className="text-white font-semibold">Kids Mode Active</h3>
              <p className="text-gray-300 text-sm">
                Showing kid-friendly content only. 
                {hiddenCount > 0 && (
                  <span className="text-pink-400"> ({hiddenCount} titles hidden)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Genre Filters */}
      <div className="mb-12">
        <h3 className="text-lg font-medium text-white mb-4">Filter by Genre</h3>
        <div className="flex flex-wrap gap-3">
          {filteredGenres.map((genre) => (
            <GenreBadge key={genre.uid} genre={genre} />
          ))}
        </div>
      </div>

      {/* Anime Grid */}
      {filteredAnime.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredAnime.map((anime, index) => (
            <AnimeCard key={anime.uid} anime={anime} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-medium text-white mb-2">No anime found</h3>
          <p className="text-gray-400">
            {isKidsProfile 
              ? "No kid-friendly anime available. Try switching to Normal profile."
              : "Check back later for new additions!"
            }
          </p>
        </div>
      )}
    </>
  );
}
