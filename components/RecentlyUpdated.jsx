'use client';

import Image from 'next/image';

export default function RecentlyUpdated({ update }) {
  if (!update || !update.episodesList || update.episodesList.length === 0) {
    return null;
  }

  const episodes = update.episodesList;
  const updateDate = new Date(update.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            Recently Updated
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Last updated: {updateDate}
          </p>
        </div>
        <div className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full">
          <span className="text-red-400 text-sm font-medium animate-pulse">● LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {episodes.map((episode, index) => (
          <div
            key={`${episode.anime_mal_id}-${episode.episode_number}`}
            className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl overflow-hidden border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Episode Image */}
            <div className="relative h-32 overflow-hidden">
              {episode.anime_image && !episode.anime_image.includes('icon-banned') ? (
                <Image
                  src={episode.anime_image}
                  alt={episode.anime_title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
              )}
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
              
              {/* Episode badge */}
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-600 rounded text-xs font-bold text-white">
                EP {episode.episode_number || 'NEW'}
              </div>
              
              {/* Premium badge */}
              {episode.is_premium && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 rounded text-xs font-bold text-black">
                  ★ PREMIUM
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-3">
              <h3 className="text-white font-semibold text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                {episode.anime_title}
              </h3>
              <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                {episode.episode_title}
              </p>
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/5 transition-colors duration-300" />
          </div>
        ))}
      </div>
    </section>
  );
}

