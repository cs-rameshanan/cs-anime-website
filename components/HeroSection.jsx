import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection({ featuredAnime }) {
  const hero = featuredAnime?.[0];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {hero?.poster_url && (
          <Image
            src={hero.poster_url}
            alt=""
            fill
            className="object-cover opacity-20 blur-sm"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/80 via-midnight/60 to-midnight" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-aurora/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-stardust/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 opacity-0 animate-slide-up">
          <span className="text-white">Discover Your</span>
          <br />
          <span className="gradient-text">Next Anime</span>
        </h1>
        
        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 opacity-0 animate-slide-up stagger-2">
          Explore a curated collection of the best anime, from timeless classics 
          to the latest releases. Your journey into the anime universe starts here.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-slide-up stagger-3">
          <Link
            href="/anime"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-aurora to-stardust text-white font-semibold text-lg hover:opacity-90 transition-opacity animate-glow"
          >
            Browse Collection
          </Link>
          <Link
            href="/genres"
            className="px-8 py-4 rounded-full glass text-white font-semibold text-lg hover:bg-white/10 transition-colors"
          >
            Explore Genres
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 opacity-0 animate-slide-up stagger-4">
          <div>
            <div className="text-3xl font-bold gradient-text">25+</div>
            <div className="text-gray-400 text-sm">Anime</div>
          </div>
          <div>
            <div className="text-3xl font-bold gradient-text">10+</div>
            <div className="text-gray-400 text-sm">Genres</div>
          </div>
          <div>
            <div className="text-3xl font-bold gradient-text">100+</div>
            <div className="text-gray-400 text-sm">Episodes</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}

