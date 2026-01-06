'use client';

import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import Link from 'next/link';

export default function MangaAddToCart({ manga }) {
  const { addToCart, cart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const inCart = cart.find(item => item.uid === manga.uid);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        uid: manga.uid,
        title: manga.title,
        price: manga.price,
        cover_image: manga.cover_image,
        author: manga.author,
        slug: manga.slug,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-gray-400">Quantity:</span>
        <div className="flex items-center glass rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-4 py-2 text-white hover:text-aurora transition-colors"
          >
            −
          </button>
          <span className="px-4 py-2 text-white font-medium min-w-[3rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="px-4 py-2 text-white hover:text-aurora transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
          added
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-aurora to-stardust text-white hover:opacity-90'
        }`}
      >
        {added ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Added to Cart!
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add to Cart - ${(manga.price * quantity).toFixed(2)}
          </span>
        )}
      </button>

      {/* View Cart Link */}
      {inCart && (
        <Link
          href="/cart"
          className="block w-full py-3 text-center glass rounded-xl text-aurora hover:text-white transition-colors"
        >
          View Cart ({inCart.quantity} in cart)
        </Link>
      )}
    </div>
  );
}

