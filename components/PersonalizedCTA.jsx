'use client';

import Link from 'next/link';
import { useProfile } from '@/context/ProfileContext';
import { PROFILE_TYPES } from '@/lib/profileConfig';

export default function PersonalizedCTA() {
  const { profileType, isLoading } = useProfile();
  const isKidsProfile = profileType === PROFILE_TYPES.KIDS;

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
        {isKidsProfile ? (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready for an Adventure?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Explore fun and exciting anime perfect for kids. Start watching now!
            </p>
            <Link
              href="/anime"
              className="inline-flex px-8 py-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              Start Watching!
            </Link>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  );
}
