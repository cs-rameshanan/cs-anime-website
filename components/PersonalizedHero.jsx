'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useProfile } from '@/context/ProfileContext';
import { PROFILE_TYPES } from '@/lib/profileConfig';

// Personalized content for each profile
const HERO_CONTENT = {
  [PROFILE_TYPES.KIDS]: {
    title: {
      line1: 'Welcome to',
      line2: 'AniVerse Kids!',
    },
    subtitle: 'Fun and safe anime adventures for young viewers. Discover exciting stories perfect for kids!',
    primaryButton: {
      text: "Let's Watch!",
      href: '/anime',
    },
    secondaryButton: {
      text: 'Fun Genres',
      href: '/genres',
    },
    stats: {
      anime: '15+',
      animeLabel: 'Kid-Friendly',
      genres: '5+',
      genresLabel: 'Fun Genres',
      episodes: '50+',
      episodesLabel: 'Adventures',
    },
    gradientClass: 'from-pink-500 to-purple-500',
    orbColors: {
      primary: 'bg-pink-500/20',
      secondary: 'bg-purple-400/20',
    },
  },
  [PROFILE_TYPES.NORMAL]: {
    title: {
      line1: 'Discover Your',
      line2: 'Next Anime',
    },
    subtitle: 'Explore a curated collection of the best anime, from timeless classics to the latest releases. Your journey into the anime universe starts here.',
    primaryButton: {
      text: 'Browse Collection',
      href: '/anime',
    },
    secondaryButton: {
      text: 'Explore Genres',
      href: '/genres',
    },
    stats: {
      anime: '25+',
      animeLabel: 'Anime',
      genres: '10+',
      genresLabel: 'Genres',
      episodes: '100+',
      episodesLabel: 'Episodes',
    },
    gradientClass: 'from-aurora to-stardust',
    orbColors: {
      primary: 'bg-aurora/20',
      secondary: 'bg-stardust/20',
    },
  },
};

export default function PersonalizedHero({ featuredAnime, homepage }) {
  const { profileType, isLoading } = useProfile();
  const hero = featuredAnime?.[0];
  
  // Get content based on profile, default to normal
  const defaults = HERO_CONTENT[profileType] || HERO_CONTENT[PROFILE_TYPES.NORMAL];
  
  // Merge CMS homepage data with hardcoded defaults (CMS wins if available)
  const content = homepage ? {
    title: {
      line1: homepage.hero_title_line1 || defaults.title.line1,
      line2: homepage.hero_title_line2 || defaults.title.line2,
    },
    subtitle: homepage.hero_subtitle || defaults.subtitle,
    primaryButton: {
      text: homepage.primary_button_text || defaults.primaryButton.text,
      href: homepage.primary_button_link || defaults.primaryButton.href,
    },
    secondaryButton: {
      text: homepage.secondary_button_text || defaults.secondaryButton.text,
      href: homepage.secondary_button_link || defaults.secondaryButton.href,
    },
    stats: defaults.stats,
    gradientClass: homepage.theme_gradient || defaults.gradientClass,
    orbColors: defaults.orbColors,
  } : defaults;

  if (isLoading) {
    return (
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/80 via-midnight/60 to-midnight" />
        <div className="relative z-10 text-center">
          <div className="w-64 h-12 bg-gray-700 rounded-lg animate-pulse mx-auto mb-4"></div>
          <div className="w-96 h-8 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
        </div>
      </section>
    );
  }

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
        
        {/* Animated gradient orbs - colors change based on profile */}
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${content.orbColors.primary} rounded-full blur-3xl animate-float`} />
        <div 
          className={`absolute bottom-1/4 right-1/4 w-80 h-80 ${content.orbColors.secondary} rounded-full blur-3xl animate-float`} 
          style={{ animationDelay: '1s' }} 
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Kids Mode Badge */}
        {profileType === PROFILE_TYPES.KIDS && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 mb-6 animate-slide-up">
            <span className="text-xl">👶</span>
            <span className="font-medium">Kids Mode</span>
          </div>
        )}

        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 opacity-0 animate-slide-up">
          <span className="text-white">{content.title.line1}</span>
          <br />
          <span className={`bg-gradient-to-r ${content.gradientClass} bg-clip-text text-transparent`}>
            {content.title.line2}
          </span>
        </h1>
        
        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 opacity-0 animate-slide-up stagger-2">
          {content.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-slide-up stagger-3">
          <Link
            href={content.primaryButton.href}
            className={`px-8 py-4 rounded-full bg-gradient-to-r ${content.gradientClass} text-white font-semibold text-lg hover:opacity-90 transition-opacity animate-glow`}
          >
            {content.primaryButton.text}
          </Link>
          <Link
            href={content.secondaryButton.href}
            className="px-8 py-4 rounded-full glass text-white font-semibold text-lg hover:bg-white/10 transition-colors"
          >
            {content.secondaryButton.text}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 opacity-0 animate-slide-up stagger-4">
          <div>
            <div className={`text-3xl font-bold bg-gradient-to-r ${content.gradientClass} bg-clip-text text-transparent`}>
              {content.stats.anime}
            </div>
            <div className="text-gray-400 text-sm">{content.stats.animeLabel}</div>
          </div>
          <div>
            <div className={`text-3xl font-bold bg-gradient-to-r ${content.gradientClass} bg-clip-text text-transparent`}>
              {content.stats.genres}
            </div>
            <div className="text-gray-400 text-sm">{content.stats.genresLabel}</div>
          </div>
          <div>
            <div className={`text-3xl font-bold bg-gradient-to-r ${content.gradientClass} bg-clip-text text-transparent`}>
              {content.stats.episodes}
            </div>
            <div className="text-gray-400 text-sm">{content.stats.episodesLabel}</div>
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
