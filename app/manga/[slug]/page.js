import { getMangaBySlug, getAllManga } from '@/lib/api';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import MangaAddToCart from '@/components/MangaAddToCart';

export const revalidate = 60;

export async function generateStaticParams() {
  const mangaList = await getAllManga();
  return mangaList.map((manga) => ({
    slug: manga.slug,
  }));
}

export async function generateMetadata({ params }) {
  const manga = await getMangaBySlug(params.slug);
  if (!manga) return { title: 'Manga Not Found' };
  
  return {
    title: `${manga.title} | AniVerse Manga Store`,
    description: manga.synopsis?.substring(0, 160) || `Buy ${manga.title} manga`,
  };
}

export default async function MangaDetailPage({ params }) {
  const manga = await getMangaBySlug(params.slug);

  if (!manga) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Cover Image */}
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden glass">
            {manga.cover_image ? (
              <Image
                src={manga.cover_image}
                alt={manga.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                <span className="text-9xl">📚</span>
              </div>
            )}
          </div>

          {/* Manga Details */}
          <div className="flex flex-col">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              {manga.title}
            </h1>
            
            <p className="text-xl text-aurora mb-6">
              by {manga.author || 'Unknown Author'}
            </p>

            {/* Price & Add to Cart */}
            <div className="glass rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-gray-400 text-sm">Price</span>
                  <div className="text-4xl font-bold text-green-400">
                    ${manga.price?.toFixed(2) || '19.99'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 text-sm">Status</span>
                  <div className="text-lg text-white">
                    {manga.status || 'Available'}
                  </div>
                </div>
              </div>
              
              <MangaAddToCart manga={manga} />
            </div>

            {/* Manga Info */}
            <div className="glass rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-bold text-white mb-4">Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Volumes</span>
                  <p className="text-white font-medium">{manga.volumes || 'Ongoing'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Status</span>
                  <p className="text-white font-medium">{manga.status || 'Publishing'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Author</span>
                  <p className="text-white font-medium">{manga.author || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Format</span>
                  <p className="text-white font-medium">Paperback</p>
                </div>
              </div>
            </div>

            {/* Synopsis */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Synopsis</h3>
              <p className="text-gray-300 leading-relaxed">
                {manga.synopsis || 'No synopsis available.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

