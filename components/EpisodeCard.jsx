export default function EpisodeCard({ episode, index = 0 }) {
  return (
    <div 
      className={`glass rounded-xl p-4 hover:bg-white/10 transition-all duration-300 opacity-0 animate-slide-up`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start gap-4">
        {/* Episode Number */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-aurora to-stardust flex items-center justify-center">
          <span className="text-white font-bold">{episode.episode_number}</span>
        </div>

        {/* Episode Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white mb-1 line-clamp-1">
            {episode.title || `Episode ${episode.episode_number}`}
          </h4>
          
          {episode.synopsis && (
            <p className="text-gray-400 text-sm line-clamp-2 mb-2">
              {episode.synopsis}
            </p>
          )}

          {episode.air_date && (
            <p className="text-gray-500 text-xs">
              Aired: {new Date(episode.air_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

