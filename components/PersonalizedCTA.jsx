'use client';

import Link from 'next/link';
import { useProfile } from '@/context/ProfileContext';
import { PROFILE_TYPES } from '@/lib/profileConfig';

export default function PersonalizedCTA({ homepage }) {
  const { profileType, isLoading } = useProfile();
  const isKidsProfile = profileType === PROFILE_TYPES.KIDS;
  
  // CMS content with profile-based defaults
  const cta = {
    title: homepage?.cta_title || (isKidsProfile ? 'Ready for an Adventure?' : 'Ready to Start Watching?'),
    description: homepage?.cta_description || (isKidsProfile 
      ? 'Explore fun and exciting anime perfect for kids. Start watching now!'
      : 'Explore our complete collection of anime and find your next favorite series.'),
    buttonText: homepage?.cta_button_text || (isKidsProfile ? 'Start Watching!' : 'Start Exploring'),
    buttonLink: homepage?.cta_button_link || '/anime',
    gradient: homepage?.theme_gradient || (isKidsProfile ? 'from-pink-500 to-purple-500' : 'from-aurora to-stardust'),
  };

  if (isLoading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="h-10 w-64 bg-gray-700 rounded-lg animate-pulse mx-auto mb-6"></div>
          <div className="h-6 w-96 bg-gray-700 rounded-lg animate-pulse mx-auto mb-8"></div>
          <div className="h-14 w-48 bg-gray-700 rounded-full animate-pulse mx-auto"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <>
          {isKidsProfile && <div className="text-6xl mb-4">🎉</div>}
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
            {cta.title}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {cta.description}
          </p>
          <Link
            href={cta.buttonLink}
            className={`inline-flex px-8 py-4 rounded-full bg-gradient-to-r ${cta.gradient} text-white font-semibold text-lg hover:opacity-90 transition-opacity`}
          >
            {cta.buttonText}
          </Link>
        </>
      </div>
    </section>
  );
}
