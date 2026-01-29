'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

export default function MangaCard({ manga, index = 0 }) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    setIsAdding(true);
    addToCart({
      uid: manga.uid,
      title: manga.title,
      price: manga.price,
      cover_image: manga.cover_image,
      author: manga.author,
      slug: manga.slug,
    });
    setTimeout(() => setIsAdding(false), 500);
  };

  const slug = manga.slug || manga.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <div 
      className="group relative glass rounded-2xl overflow-hidden hover-glow transition-all duration-500"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Link href={`/manga/${slug}`}>
        <div className="aspect-[3/4] relative overflow-hidden">
          {manga.cover_image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={manga.cover_image}
              alt={manga.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
              <span className="text-6xl">📚</span>
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          
          {/* Price badge */}
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-green-500/90 backdrop-blur-sm">
            <span className="text-white font-bold">${manga.price?.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-aurora transition-colors">
            {manga.title}
          </h3>
          <p className="text-gray-400 text-sm mb-2">
            by {manga.author || 'Unknown'}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="px-2 py-0.5 rounded-full bg-white/10">
              {manga.volumes || '?'} vols
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10">
              {manga.status || 'Publishing'}
            </span>
          </div>
        </div>
      </Link>
      
      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        className={`absolute bottom-4 right-4 p-3 rounded-full transition-all duration-300 ${
          isAdding 
            ? 'bg-green-500 scale-110' 
            : 'bg-aurora/90 hover:bg-aurora hover:scale-110'
        }`}
      >
        {isAdding ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
      </button>
    </div>
  );
}

