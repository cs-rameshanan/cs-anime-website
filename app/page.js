import { getFeaturedAnime, getAllGenres, getLatestDailyUpdate, getHomepage } from '@/lib/api';
import PersonalizedHero from '@/components/PersonalizedHero';
import PersonalizedFeaturedAnime from '@/components/PersonalizedFeaturedAnime';
import PersonalizedGenres from '@/components/PersonalizedGenres';
import PersonalizedCTA from '@/components/PersonalizedCTA';
import RecentlyUpdated from '@/components/RecentlyUpdated';

// Use force-dynamic for Launch compatibility (CDN caching handled via next.config.js headers)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [featuredAnime, genres, dailyUpdate, homepage] = await Promise.all([
    getFeaturedAnime(8),
    getAllGenres(),
    getLatestDailyUpdate(),
    getHomepage(),
  ]);

  return (
    <div>
      {/* Personalized Hero Section - uses CMS homepage content + profile switching */}
      <PersonalizedHero featuredAnime={featuredAnime} homepage={homepage} />

      {/* Recently Updated Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <RecentlyUpdated update={dailyUpdate} />
        </div>
      </section>

      {/* Personalized Featured Anime - uses CMS homepage + profile filtering */}
      <PersonalizedFeaturedAnime animeList={featuredAnime} homepage={homepage} />

      {/* Personalized Genres - hides blocked genres for Kids */}
      <PersonalizedGenres genres={genres} />

      {/* Personalized CTA Section - uses CMS homepage content */}
      <PersonalizedCTA homepage={homepage} />
    </div>
  );
}

