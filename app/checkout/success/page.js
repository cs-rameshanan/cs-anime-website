'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
          Order Placed Successfully!
        </h1>

        <p className="text-gray-300 text-lg mb-2">
          Thank you for your purchase!
        </p>

        {/* Email Notice */}
        <div className="glass rounded-xl p-6 mb-8 border border-aurora/30">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg className="w-8 h-8 text-aurora" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-white font-semibold text-lg">Check Your Email</span>
          </div>
          <p className="text-gray-400">
            A confirmation email with your order details has been sent to your inbox. Please check your email for a copy of your receipt.
          </p>
        </div>

        {orderId && (
          <div className="glass rounded-xl p-4 mb-8">
            <span className="text-gray-400 text-sm">Order ID</span>
            <p className="text-aurora font-mono font-bold text-lg">{orderId}</p>
          </div>
        )}

        <div className="space-y-4">
          <Link
            href="/manga"
            className="block w-full py-4 rounded-xl bg-gradient-to-r from-aurora to-stardust text-white font-bold hover:opacity-90 transition-opacity"
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="block w-full py-4 rounded-xl glass text-white hover:text-aurora transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

