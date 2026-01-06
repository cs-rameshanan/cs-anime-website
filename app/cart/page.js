'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, isLoaded } = useCart();

  if (!isLoaded) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading cart...</div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="text-8xl mb-6">🛒</div>
          <h1 className="font-display text-3xl font-bold text-white mb-4">
            Your Cart is Empty
          </h1>
          <p className="text-gray-400 mb-8">
            Looks like you haven't added any manga yet.
          </p>
          <Link
            href="/manga"
            className="inline-flex px-8 py-4 rounded-full bg-gradient-to-r from-aurora to-stardust text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Browse Manga
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-8">
          Shopping Cart
        </h1>

        <div className="space-y-4 mb-8">
          {cart.map((item) => (
            <div
              key={item.uid}
              className="glass rounded-2xl p-4 flex items-center gap-4"
            >
              {/* Cover */}
              <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0">
                {item.cover_image ? (
                  <Image
                    src={item.cover_image}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.author}</p>
                <p className="text-green-400 font-bold">${item.price?.toFixed(2)}</p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.uid, item.quantity - 1)}
                  className="w-8 h-8 rounded-full glass text-white hover:text-aurora transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-white font-medium w-8 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.uid, item.quantity + 1)}
                  className="w-8 h-8 rounded-full glass text-white hover:text-aurora transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Subtotal */}
              <div className="text-right min-w-[80px]">
                <p className="text-white font-bold">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFromCart(item.uid)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Shipping</span>
              <span>{cartTotal >= 50 ? 'Free' : '$4.99'}</span>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between text-white text-lg font-bold">
              <span>Total</span>
              <span>${(cartTotal + (cartTotal >= 50 ? 0 : 4.99)).toFixed(2)}</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="block w-full py-4 text-center rounded-xl bg-gradient-to-r from-aurora to-stardust text-white font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Proceed to Checkout
          </Link>
          
          <Link
            href="/manga"
            className="block w-full py-3 text-center text-aurora hover:text-white transition-colors mt-4"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

