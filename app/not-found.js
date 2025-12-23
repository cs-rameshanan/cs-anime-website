import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl mb-6 animate-float">🌌</div>
        <h1 className="font-display text-5xl font-bold text-white mb-4">
          Lost in Space
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for has drifted into another dimension.
        </p>
        <Link
          href="/"
          className="inline-flex px-8 py-4 rounded-full bg-gradient-to-r from-aurora to-stardust text-white font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

