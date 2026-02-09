import { getAllManga } from '@/lib/api';
import MangaCard from '@/components/MangaCard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manga Store | AniVerse',
  description: 'Browse and buy the best manga collection',
};

export default async function MangaPage() {
  const mangaList = await getAllManga();

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            <span className="gradient-text">Manga Store</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover and collect the finest manga from top publishers
          </p>
        </div>

        {/* Stats Banner */}
        <div className="glass rounded-2xl p-6 mb-12">
          <div className="flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-aurora">{mangaList.length}+</div>
              <div className="text-gray-400 text-sm">Manga Titles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-stardust">Free</div>
              <div className="text-gray-400 text-sm">Shipping Over $50</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">24/7</div>
              <div className="text-gray-400 text-sm">Support</div>
            </div>
          </div>
        </div>

        {/* Manga Grid */}
        {mangaList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mangaList.map((manga, index) => (
              <MangaCard key={manga.uid} manga={manga} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-white mb-2">No manga available yet</h2>
            <p className="text-gray-400">Check back soon for our manga collection!</p>
          </div>
        )}
      </div>
    </div>
  );
}

