import { getFeaturedAnime, getAllGenres, getLatestDailyUpdate } from '@/lib/api';
import PersonalizedHero from '@/components/PersonalizedHero';
import PersonalizedFeaturedAnime from '@/components/PersonalizedFeaturedAnime';
import PersonalizedGenres from '@/components/PersonalizedGenres';
import PersonalizedCTA from '@/components/PersonalizedCTA';
import RecentlyUpdated from '@/components/RecentlyUpdated';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  const [featuredAnime, genres, dailyUpdate] = await Promise.all([
    getFeaturedAnime(8),
    getAllGenres(),
    getLatestDailyUpdate(),
  ]);

  return (
    <div>
      {/* Personalized Hero Section - changes based on Kids/Normal profile */}
      <PersonalizedHero featuredAnime={featuredAnime} />

      {/* Recently Updated Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <RecentlyUpdated update={dailyUpdate} />
        </div>
      </section>

      {/* Personalized Featured Anime - filtered for Kids profile */}
      <PersonalizedFeaturedAnime animeList={featuredAnime} />

      {/* Personalized Genres - hides blocked genres for Kids */}
      <PersonalizedGenres genres={genres} />

      {/* Personalized CTA Section */}
      <PersonalizedCTA />
    </div>
  );
}

